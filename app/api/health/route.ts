import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return NextResponse.json(
    {
      status: configured ? "ok" : "degraded",
      service: "rcsca-v2",
      release:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
        process.env.NEXT_PUBLIC_APP_VERSION ||
        "local",
      configured,
      checkedAt: new Date().toISOString(),
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
