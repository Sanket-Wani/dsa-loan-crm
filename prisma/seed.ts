import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LOAN_PRODUCTS } from "../src/lib/products";
const prisma = new PrismaClient();
async function main() {
  // DEV-ONLY demo users — documented in README. Never use in production.
  const users = [
    { email: "superadmin@dev.local", name: "Dev Super Admin", role: "SUPER_ADMIN" as const, employeeCode: "EMP001", password: "SuperAdmin@123" },
    { email: "admin@dev.local", name: "Dev Admin", role: "ADMIN" as const, employeeCode: "EMP002", password: "Admin@12345" },
    { email: "telecaller@dev.local", name: "Dev Telecaller", role: "TELECALLER" as const, employeeCode: "EMP003", password: "Telecaller@123" },
    { email: "backoffice@dev.local", name: "Dev Back Office", role: "BACK_OFFICE" as const, employeeCode: "EMP004", password: "BackOffice@123" },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { email: u.email, name: u.name, role: u.role, employeeCode: u.employeeCode, passwordHash } });
  }
  for (const p of LOAN_PRODUCTS) {
    await prisma.loanProduct.upsert({ where: { code: p.code }, update: { name: p.name, pendingConfirmation: p.pendingConfirmation }, create: { code: p.code, name: p.name, pendingConfirmation: p.pendingConfirmation } });
  }
  for (const b of [{ name: "HDFC Bank", code: "HDFC" }, { name: "ICICI Bank", code: "ICICI" }, { name: "State Bank of India", code: "SBI" }, { name: "Axis Bank", code: "AXIS" }, { name: "Bajaj Finserv", code: "BAJAJ" }]) {
    await prisma.bank.upsert({ where: { name: b.name }, update: {}, create: b });
  }
  // Sample document requirements for a few products (configurable, admin-editable data — not code)
  const bl = await prisma.loanProduct.findUnique({ where: { code: "BL" } });
  const hl = await prisma.loanProduct.findUnique({ where: { code: "HL" } });
  const reqs = [
    { productId: bl?.id, category: "KYC", name: "PAN Card" },
    { productId: bl?.id, category: "KYC", name: "Aadhaar Card" },
    { productId: bl?.id, category: "Financial", name: "Last 2 years ITR" },
    { productId: bl?.id, category: "Financial", name: "6 months bank statement" },
    { productId: hl?.id, category: "KYC", name: "PAN Card" },
    { productId: hl?.id, category: "Property", name: "Property documents / title deed" },
    { productId: hl?.id, category: "Financial", name: "Salary slips (3 months)" },
  ];
  for (const r of reqs) {
    if (!r.productId) continue;
    const exists = await prisma.documentRequirement.findFirst({ where: { productId: r.productId, name: r.name } });
    if (!exists) await prisma.documentRequirement.create({ data: { productId: r.productId, category: r.category, name: r.name } });
  }
  console.log("Seed complete (dev-only users, 16 products, banks, sample requirements)");
}
main().finally(() => prisma.$disconnect());
