import { describe, it, expect } from "vitest";
import { can, canAccessLead, canAccessCase, PERMISSIONS } from "@/lib/rbac";
describe("RBAC matrix", () => {
  it("super admin can manage settings, admin cannot", () => {
    expect(can("SUPER_ADMIN", "settings:manage")).toBe(true);
    expect(can("ADMIN", "settings:manage")).toBe(false);
    expect(can("ADMIN", "employees:manage")).toBe(true);
  });
  it("telecaller cannot manage employees or products", () => {
    expect(can("TELECALLER", "employees:manage")).toBe(false);
    expect(can("TELECALLER", "products:manage")).toBe(false);
    expect(can("TELECALLER", "calls:create")).toBe(true);
  });
  it("back office can manage documents but not lead assignment", () => {
    expect(can("BACK_OFFICE", "documents:manage")).toBe(true);
    expect(can("BACK_OFFICE", "leads:assign")).toBe(false);
  });
  it("telecaller object-level access is denied for unassigned/other leads", () => {
    const tc = { id: "u1", role: "TELECALLER" as const };
    expect(canAccessLead(tc, { assignedToId: "u1" })).toBe(true);
    expect(canAccessLead(tc, { assignedToId: "u2" })).toBe(false);
    expect(canAccessLead(tc, { assignedToId: null })).toBe(false);
  });
  it("admin sees all leads/cases, back-office only own cases", () => {
    expect(canAccessLead({ id: "a", role: "ADMIN" }, { assignedToId: "x" })).toBe(true);
    expect(canAccessCase({ id: "b", role: "BACK_OFFICE" }, { ownerId: "b" })).toBe(true);
    expect(canAccessCase({ id: "b", role: "BACK_OFFICE" }, { ownerId: "z" })).toBe(false);
  });
  it("every role has dashboard access", () => {
    (Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).forEach((r) => expect(can(r, "dashboard:read")).toBe(true));
  });
});
