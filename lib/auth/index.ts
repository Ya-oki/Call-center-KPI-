/**
 * Auth seam — role + agent_id resolution behind a thin interface.
 *
 * P0 STUB — built in P3 (Auth + RLS). Per BUILD_SPEC §11/§12 auth lives behind
 * this interface so Supabase Auth can be swapped for the company IdP later
 * (selected via AUTH_PROVIDER) without touching the engine or UI.
 */

export type Role = "agent" | "manager" | "auditor";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  /** Set when role === 'agent'; scopes the user to their own data. */
  agentId: string | null;
}

export interface AuthAdapter {
  getSessionUser(): Promise<SessionUser | null>;
  requireRole(roles: Role[]): Promise<SessionUser>;
}

export function getAuthAdapter(): AuthAdapter {
  throw new Error("getAuthAdapter: implemented in P3 (Auth + RLS).");
}
