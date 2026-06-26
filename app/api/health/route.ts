/**
 * Health check — confirms the app + route handler layer boots.
 * Real API surface (upload, recompute, overview, leaderboard, agent, me,
 * settings, close, holdback/resolve, export) is built in P2–P4 per BUILD_SPEC §9.
 */
export function GET() {
  return Response.json({ ok: true, service: "retention-engine", phase: "P0" });
}
