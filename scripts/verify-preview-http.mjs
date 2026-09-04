import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = Number(process.env.RCSCA_PREVIEW_TEST_PORT ?? "3100");
const origin = `http://${host}:${port}`;
const requiredSecurityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "start", "--", "--hostname", host, "--port", String(port)],
  {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
server.stdout.on("data", (chunk) => (serverOutput += chunk));
server.stderr.on("data", (chunk) => (serverOutput += chunk));

function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") server.kill("SIGTERM");
  else process.kill(-server.pid, "SIGTERM");
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Preview server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not become healthy.\n${serverOutput}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifySecurityHeaders(response, route) {
  for (const [name, expected] of Object.entries(requiredSecurityHeaders)) {
    assert(
      response.headers.get(name) === expected,
      `${route}: expected ${name}=${expected}`,
    );
  }
}

try {
  await waitForHealth();

  const home = await fetch(`${origin}/`);
  const homeHtml = await home.text();
  assert(home.status === 200, `/: expected 200, got ${home.status}`);
  assert(homeHtml.includes("<title>RCSCA"), "/: title is missing");
  assert(homeHtml.length > 1000, "/: response body is unexpectedly small");
  verifySecurityHeaders(home, "/");

  const login = await fetch(`${origin}/login`);
  const loginHtml = await login.text();
  assert(login.status === 200, `/login: expected 200, got ${login.status}`);
  assert(loginHtml.includes("登入"), "/login: login content is missing");
  verifySecurityHeaders(login, "/login");

  const account = await fetch(`${origin}/account`, { redirect: "manual" });
  const redirectLocation = account.headers.get("location");
  assert(account.status === 307, `/account: expected 307, got ${account.status}`);
  assert(
    redirectLocation && new URL(redirectLocation).pathname === "/login",
    `/account: unexpected redirect ${redirectLocation}`,
  );
  assert(
    new URL(redirectLocation).searchParams.get("next") === "/account",
    "/account: redirect did not preserve the requested route",
  );
  assert(
    account.headers.get("cache-control")?.includes("no-store"),
    "/account: protected redirect must not be cached",
  );
  verifySecurityHeaders(account, "/account");

  const health = await fetch(`${origin}/api/health`);
  const healthBody = await health.json();
  assert(health.status === 200, `/api/health: expected 200, got ${health.status}`);
  assert(healthBody.status === "ok", "/api/health: status is not ok");
  assert(healthBody.configured === true, "/api/health: environment is not configured");
  assert(
    health.headers.get("cache-control")?.includes("no-store"),
    "/api/health: response must not be cached",
  );
  verifySecurityHeaders(health, "/api/health");

  console.log("Preview HTTP smoke test passed: 4/4 routes");
} finally {
  stopServer();
}
