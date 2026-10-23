export type Role = "SUPER_ADMIN" | "ADMIN" | "TELECALLER" | "BACK_OFFICE";
export type Action =
  | "employees:manage" | "employees:read"
  | "leads:read" | "leads:create" | "leads:update" | "leads:assign" | "leads:import" | "leads:read_all"
  | "calls:create" | "followups:manage" | "meetings:manage" | "handovers:create"
  | "customers:read" | "cases:read" | "cases:read_all" | "cases:create" | "cases:update"
  | "documents:manage" | "eligibility:manage" | "banks:manage" | "queries:manage"
  | "tasks:manage" | "register:read" | "register:export" | "dashboard:read" | "products:manage" | "audit:read" | "settings:manage";

const ALL: Action[] = ["employees:manage","employees:read","leads:read","leads:create","leads:update","leads:assign","leads:import","leads:read_all","calls:create","followups:manage","meetings:manage","handovers:create","customers:read","cases:read","cases:read_all","cases:create","cases:update","documents:manage","eligibility:manage","banks:manage","queries:manage","tasks:manage","register:read","register:export","dashboard:read","products:manage","audit:read","settings:manage"];

export const PERMISSIONS: Record<Role, Action[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((a) => a !== "settings:manage"),
  TELECALLER: ["leads:read","leads:create","leads:update","calls:create","followups:manage","meetings:manage","handovers:create","customers:read","cases:read","dashboard:read","tasks:manage"],
  BACK_OFFICE: ["leads:read","customers:read","cases:read","cases:update","documents:manage","eligibility:manage","banks:manage","queries:manage","tasks:manage","register:read","dashboard:read","followups:manage","meetings:manage"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}
export interface Actor { id: string; role: Role }
/** Object-level: telecallers only own assigned leads; back-office never gets unassigned leads by default. */
export function canAccessLead(actor: Actor, lead: { assignedToId: string | null }): boolean {
  if (can(actor.role, "leads:read_all")) return true;
  if (actor.role === "TELECALLER") return lead.assignedToId === actor.id;
  if (actor.role === "BACK_OFFICE") return lead.assignedToId === actor.id;
  return false;
}
export function canAccessCase(actor: Actor, loanCase: { ownerId: string | null }): boolean {
  if (can(actor.role, "cases:read_all")) return true;
  return loanCase.ownerId === actor.id;
}
/** Scope helper for list queries. Returns a Prisma-style filter fragment. */
export function leadScope(actor: Actor): Record<string, unknown> {
  if (can(actor.role, "leads:read_all")) return {};
  return { assignedToId: actor.id };
}
export function caseScope(actor: Actor): Record<string, unknown> {
  if (can(actor.role, "cases:read_all")) return {};
  return { ownerId: actor.id };
}
