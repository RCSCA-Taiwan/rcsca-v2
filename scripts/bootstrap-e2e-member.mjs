import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const CONFIRMATION = "CREATE_FORMAL_MEMBER_TEST_ACCOUNT";
const secretKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "RCSCA_E2E_EMAIL",
  "RCSCA_E2E_PASSWORD",
];
const missing = required.filter((name) => !process.env[name]?.trim());

if (!secretKey) {
  missing.push("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
}
if (missing.length) {
  console.error(`Missing bootstrap environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.RCSCA_E2E_BOOTSTRAP_CONFIRM !== CONFIRMATION) {
  console.error(`Set RCSCA_E2E_BOOTSTRAP_CONFIRM=${CONFIRMATION} to continue.`);
  process.exit(1);
}
if (process.env.RCSCA_E2E_PASSWORD.length < 12) {
  console.error("RCSCA_E2E_PASSWORD must contain at least 12 characters.");
  process.exit(1);
}

const email = process.env.RCSCA_E2E_EMAIL.trim().toLowerCase();
const password = process.env.RCSCA_E2E_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  const perPage = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to list Auth users: ${error.message}`);
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === targetEmail,
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
  }
}

let user = await findUserByEmail(email);
if (user && user.app_metadata?.purpose !== "e2e") {
  throw new Error(
    "Refusing to modify an existing account that is not tagged as an E2E account.",
  );
}

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "RCSCA E2E Member" },
    app_metadata: { purpose: "e2e", managed_by: "rcsca-bootstrap" },
  });
  if (error || !data.user) {
    throw new Error(`Unable to create E2E Auth user: ${error?.message || "no user"}`);
  }
  user = data.user;
} else {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      display_name: "RCSCA E2E Member",
    },
    app_metadata: {
      ...user.app_metadata,
      purpose: "e2e",
      managed_by: "rcsca-bootstrap",
    },
  });
  if (error || !data.user) {
    throw new Error(`Unable to refresh E2E Auth user: ${error?.message || "no user"}`);
  }
  user = data.user;
}

const { count: adminRoleCount, error: adminRoleError } = await admin
  .from("admin_roles")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id);
if (adminRoleError) {
  throw new Error(`Unable to inspect E2E admin roles: ${adminRoleError.message}`);
}
if (adminRoleCount !== 0) {
  throw new Error("E2E account has an admin role; remove it before continuing.");
}

const { error: profileError } = await admin.from("profiles").upsert({
  id: user.id,
  display_name: "RCSCA E2E Member",
  email,
  is_active: true,
});
if (profileError) throw new Error(`Unable to upsert E2E profile: ${profileError.message}`);

const { error: levelError } = await admin.from("member_levels").upsert({
  user_id: user.id,
  level: 1,
  lifetime_xp: 0,
});
if (levelError) throw new Error(`Unable to upsert E2E member level: ${levelError.message}`);

const { error: membershipError } = await admin.from("memberships").upsert(
  {
    user_id: user.id,
    membership_type: "annual",
    member_since: new Date().toISOString().slice(0, 10),
    member_number: "E2E-MEMBER",
    status: "active",
  },
  { onConflict: "user_id" },
);
if (membershipError) {
  throw new Error(`Unable to upsert E2E membership: ${membershipError.message}`);
}

console.log(`E2E formal-member account is ready: ${email} (${user.id}).`);
