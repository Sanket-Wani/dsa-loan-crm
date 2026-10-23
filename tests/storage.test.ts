import { describe, it, expect, afterEach } from "vitest";
import { validateUpload, sanitizeFileName, extensionForMime, makeStorageKey, resolveLocalPath, MAX_UPLOAD_BYTES, getStorageDriver, getS3Config, s3MissingEnv, s3ConfigError, assertValidStorageKey, createS3Driver, type S3Config } from "@/lib/storage";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { registerRowValues } from "@/lib/xlsx";
import { REGISTER_COLUMNS, type RegisterRow } from "@/lib/register";
import path from "path";

describe("storage helpers", () => {
  it("generates keys decoupled from the original file name", () => {
    const key = makeStorageKey("case1", "doc1", "application/pdf", "fixed-uuid");
    expect(key).toBe("case1/doc1/fixed-uuid.pdf");
    expect(key).not.toContain("passport");
  });
  it("derives extensions from MIME type only", () => {
    expect(extensionForMime("application/pdf")).toBe(".pdf");
    expect(extensionForMime("image/png")).toBe(".png");
    expect(extensionForMime("application/zip")).toBe("");
  });
  it("validates type and size", () => {
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: 100 })).toBeNull();
    expect(validateUpload({ mimeType: "application/zip", sizeBytes: 100 })).toMatch(/Only PDF/);
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: 0 })).toMatch(/size/);
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: MAX_UPLOAD_BYTES + 1 })).toMatch(/size/);
  });
  it("sanitises display file names", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe(".._.._etc_passwd.pdf");
    expect(sanitizeFileName("a/b\\c.pdf")).toBe("a_b_c.pdf");
  });
  it("rejects storage keys that escape the storage directory", () => {
    expect(() => resolveLocalPath("/tmp/store", "../secret.txt")).toThrow(/Invalid storage key/);
    expect(resolveLocalPath("/tmp/store", "case1/doc1/f.pdf")).toBe(path.resolve("/tmp/store", "case1/doc1/f.pdf"));
  });
});

describe("s3 storage driver", () => {
  const ENV_KEYS = ["STORAGE_DRIVER", "S3_BUCKET", "S3_REGION", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const fullEnv = {
    S3_BUCKET: "crm-docs",
    S3_REGION: "ap-south-1",
    S3_ACCESS_KEY_ID: "test-access-key",
    S3_SECRET_ACCESS_KEY: "test-secret-key",
  } as NodeJS.ProcessEnv;

  it("reports every missing S3 env var and builds config when complete", () => {
    expect(s3MissingEnv({} as NodeJS.ProcessEnv)).toEqual(["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]);
    expect(s3ConfigError({} as NodeJS.ProcessEnv)).toMatch(/missing: S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY/);
    expect(() => getS3Config({} as NodeJS.ProcessEnv)).toThrow(/not configured/);
    const cfg = getS3Config(fullEnv);
    expect(cfg.bucket).toBe("crm-docs");
    expect(cfg.region).toBe("ap-south-1");
    expect(cfg.endpoint).toBeUndefined();
    expect(getS3Config({ ...fullEnv, S3_ENDPOINT: "https://minio.example.test" }).endpoint).toBe("https://minio.example.test");
  });

  it("fails loudly (no silent fallback) when S3 is selected but unconfigured", async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    const driver = createS3Driver();
    await expect(driver.put("case1/doc1/f.pdf", Buffer.from("x"))).rejects.toThrow(/not configured/);
    await expect(driver.get("case1/doc1/f.pdf")).rejects.toThrow(/not configured/);
  });

  it("rejects traversal / malformed storage keys like the local driver", () => {
    expect(() => assertValidStorageKey("../secret.txt")).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey("case1/../../secret")).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey("/absolute/path.pdf")).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey("case1\\doc1\\f.pdf")).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey("")).toThrow(/Invalid storage key/);
    expect(() => assertValidStorageKey(makeStorageKey("case1", "doc1", "application/pdf", "fixed-uuid"))).not.toThrow();
  });

  it("put/get round-trips through the SDK client with the configured bucket", async () => {
    const sent: unknown[] = [];
    const stored = Buffer.from("pdf-bytes");
    const fakeClient = {
      async send(command: unknown) {
        sent.push(command);
        if (command instanceof GetObjectCommand) {
          return { Body: { transformToByteArray: async () => new Uint8Array(stored) } };
        }
        return {};
      },
    };
    const config: S3Config = { bucket: "crm-docs", region: "ap-south-1", accessKeyId: "k", secretAccessKey: "s" };
    const driver = createS3Driver(fakeClient, config);
    await driver.put("case1/doc1/f.pdf", stored);
    const putCmd = sent[0] as PutObjectCommand;
    expect(putCmd).toBeInstanceOf(PutObjectCommand);
    expect(putCmd.input.Bucket).toBe("crm-docs");
    expect(putCmd.input.Key).toBe("case1/doc1/f.pdf");
    expect(Buffer.from(putCmd.input.Body as Uint8Array).equals(stored)).toBe(true);

    const got = await driver.get("case1/doc1/f.pdf");
    const getCmd = sent[1] as GetObjectCommand;
    expect(getCmd).toBeInstanceOf(GetObjectCommand);
    expect(getCmd.input.Bucket).toBe("crm-docs");
    expect(getCmd.input.Key).toBe("case1/doc1/f.pdf");
    expect(got.equals(stored)).toBe(true);

    // Invalid keys are rejected before any SDK call is made.
    const before = sent.length;
    await expect(driver.put("../escape.pdf", stored)).rejects.toThrow(/Invalid storage key/);
    expect(sent.length).toBe(before);
  });

  it("getStorageDriver selects s3 only when STORAGE_DRIVER=s3", async () => {
    delete process.env.STORAGE_DRIVER;
    expect(getStorageDriver()).toBe(getStorageDriver()); // local default, stable
    process.env.STORAGE_DRIVER = "s3";
    const s3 = getStorageDriver();
    // Invalid key is rejected by the s3 driver before config/network is touched.
    await expect(s3.put("../escape.pdf", Buffer.from("x"))).rejects.toThrow(/Invalid storage key/);
    process.env.STORAGE_DRIVER = "local";
    expect(getStorageDriver()).not.toBe(s3);
  });
});

describe("xlsx register mapping", () => {
  it("maps a register row to values in REGISTER_COLUMNS order", () => {
    const row = {
      id: "x", caseId: "c1", caseCode: "DSA-2026-0001",
      "Login Date": "2026-10-23", "Company Name": "Acme Pvt Ltd", "Client Name": "Ravi",
      Product: "BL", Status: "DISBURSED", "Bank Name": "HDFC Bank",
      "Bank Manager / Consultant": "Mgr", "Office Sales": "Sales1", "Employee Code": "EMP003",
      "Reference / Telecaller": "Dev Telecaller", Remarks: "ok",
      "Sanctioned Loan Amount": 900000, "Disbursed Loan Amount": 850000,
    } as unknown as RegisterRow;
    const values = registerRowValues(row);
    expect(values).toHaveLength(REGISTER_COLUMNS.length);
    expect(values[0]).toBe("2026-10-23");
    expect(values[2]).toBe("Ravi");
    expect(values[REGISTER_COLUMNS.indexOf("Sanctioned Loan Amount")]).toBe(900000);
    expect(values[REGISTER_COLUMNS.indexOf("Disbursed Loan Amount")]).toBe(850000);
  });
});
