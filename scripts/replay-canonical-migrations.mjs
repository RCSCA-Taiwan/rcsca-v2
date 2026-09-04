import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CLI_VERSION = "2.116.0";
const projectRoot = process.cwd();
const archiveRoot = path.join(projectRoot, "supabase", "canonical_migrations");
const manifest = JSON.parse(
  fs.readFileSync(path.join(archiveRoot, "manifest.json"), "utf8"),
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.error || result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    throw result.error ?? new Error(`${command} exited with ${result.status}`);
  }
  return result;
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    stdio: "ignore",
  });
  return !result.error;
}

if (!commandExists("docker")) {
  console.error(
    "Canonical replay requires Docker. Install/start a Docker-compatible runtime, then rerun npm run verify:canonical-replay.",
  );
  process.exit(2);
}

run("docker", ["info"], { capture: true });
run(process.execPath, ["scripts/verify-canonical-migrations.mjs"]);

const replayRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcsca-canonical-replay-"));
const replayMigrations = path.join(replayRoot, "supabase", "migrations");
const cli = ["-y", `supabase@${CLI_VERSION}`];
let stackStarted = false;

try {
  run("npx", [...cli, "init", "--workdir", replayRoot, "--yes"]);
  fs.mkdirSync(replayMigrations, { recursive: true });

  for (const migration of manifest.migrations) {
    const filename = `${migration.version}_${migration.name}.sql`;
    const exported = fs.readFileSync(path.join(archiveRoot, filename), "utf8");
    const separator = exported.indexOf("\n\n");
    if (separator < 0) throw new Error(`${filename}: export header missing`);
    fs.writeFileSync(path.join(replayMigrations, filename), exported.slice(separator + 2));
  }

  run("npx", [...cli, "start", "--workdir", replayRoot]);
  stackStarted = true;
  run("npx", [
    ...cli,
    "db",
    "reset",
    "--local",
    "--no-seed",
    "--workdir",
    replayRoot,
    "--yes",
  ]);
  run("npx", [
    ...cli,
    "migration",
    "list",
    "--local",
    "--workdir",
    replayRoot,
  ]);
  console.log(`Canonical empty-database replay passed: ${manifest.count}/${manifest.count}`);
} finally {
  if (stackStarted) {
    spawnSync("npx", [...cli, "stop", "--workdir", replayRoot, "--no-backup"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
  }
  fs.rmSync(replayRoot, { recursive: true, force: true });
}
