import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

try {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.protocol !== "https:") throw new Error("URL must use HTTPS");
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  process.exit(1);
}

if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim().length < 40) {
  console.error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY appears invalid.");
  process.exit(1);
}

console.log("Required public environment variables are present and valid.");
