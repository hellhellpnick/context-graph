import type { BuildPlan } from '../types';

export function parseBuildPlan(raw: string): BuildPlan | null {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  // Find first { to last } to be resilient to leading/trailing text
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    const plan = JSON.parse(stripped.slice(start, end + 1)) as BuildPlan;
    if (!plan.subsystems || !Array.isArray(plan.subsystems)) return null;
    return plan;
  } catch {
    return null;
  }
}
