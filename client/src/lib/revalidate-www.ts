/**
 * Pings the www on-demand revalidation endpoint so admin edits appear on the
 * public site immediately (instead of after the time-based ISR window).
 *
 * Server-only. Safe to call from API route handlers: it's wrapped in try/catch
 * with a short timeout and no-ops (with a warning) when the env isn't set, so a
 * revalidation failure never breaks the originating save.
 *
 * Env:
 *   WWW_REVALIDATE_URL  — full endpoint URL (defaults to the prod www)
 *   REVALIDATE_SECRET   — shared secret; must match the www deployment
 */

const DEFAULT_URL = "https://www.imheretravels.com/api/revalidate";

export async function revalidateWww(
  body: { all?: boolean; paths?: string[] } = { all: true },
): Promise<void> {
  const url = process.env.WWW_REVALIDATE_URL || DEFAULT_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    console.warn(
      "[revalidate-www] REVALIDATE_SECRET not set — skipping www revalidation.",
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[revalidate-www] revalidation responded ${res.status}`);
    } else {
      console.log("✅ Triggered www revalidation");
    }
  } catch (error) {
    console.warn(
      "[revalidate-www] failed to reach www revalidation endpoint:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    clearTimeout(timeout);
  }
}
