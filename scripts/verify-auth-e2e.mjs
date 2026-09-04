import nextEnv from "@next/env";
import { createServerClient } from "@supabase/ssr";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "RCSCA_E2E_EMAIL",
  "RCSCA_E2E_PASSWORD",
  "RCSCA_E2E_BASE_URL",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing E2E environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const cookieJar = new Map();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    cookies: {
      getAll: () =>
        [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) cookieJar.set(name, value);
          else cookieJar.delete(name);
        }
      },
    },
  },
);

const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
  email: process.env.RCSCA_E2E_EMAIL,
  password: process.env.RCSCA_E2E_PASSWORD,
});
if (signInError || !signIn.user) {
  throw new Error(`Staging sign-in failed: ${signInError?.message || "no user"}`);
}

const { data: verified, error: userError } = await supabase.auth.getUser();
if (userError || verified.user?.id !== signIn.user.id) {
  throw new Error(`Verified user mismatch: ${userError?.message || "wrong id"}`);
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", signIn.user.id)
  .maybeSingle();
if (profileError || profile?.id !== signIn.user.id) {
  throw new Error(`Profile ownership check failed: ${profileError?.message || "missing row"}`);
}

const cookieHeader = [...cookieJar.entries()]
  .map(([name, value]) => `${name}=${value}`)
  .join("; ");
const accountUrl = new URL("/account", process.env.RCSCA_E2E_BASE_URL);
const signedInResponse = await fetch(accountUrl, {
  headers: { cookie: cookieHeader },
  redirect: "manual",
});
if (signedInResponse.status !== 200) {
  throw new Error(`Protected route returned HTTP ${signedInResponse.status} after sign-in`);
}

const { error: signOutError } = await supabase.auth.signOut();
if (signOutError) throw new Error(`Sign-out failed: ${signOutError.message}`);

const signedOutResponse = await fetch(accountUrl, {
  headers: {
    cookie: [...cookieJar.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; "),
  },
  redirect: "manual",
});
if (signedOutResponse.status !== 307) {
  throw new Error(`Protected route returned HTTP ${signedOutResponse.status} after sign-out`);
}

console.log("Auth E2E passed: sign-in, verified user, owned profile, protected route, sign-out redirect.");
