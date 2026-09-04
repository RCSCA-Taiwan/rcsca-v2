import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("supabase/canonical_migrations");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
);
const failures = [];

for (const migration of manifest.migrations) {
  const filename = `${migration.version}_${migration.name}.sql`;
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) {
    failures.push(`${filename}: missing`);
    continue;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const separator = raw.indexOf("\n\n");
  if (separator < 0) {
    failures.push(`${filename}: export header missing`);
    continue;
  }

  let sql = raw.slice(separator + 2);
  if (!migration.trailing_newline && sql.endsWith("\n")) {
    sql = sql.slice(0, -1);
  }
  const bytes = Buffer.byteLength(sql);
  const md5 = crypto.createHash("md5").update(sql).digest("hex");
  if (bytes !== migration.bytes || md5 !== migration.md5) {
    failures.push(
      `${filename}: expected ${migration.bytes}/${migration.md5}, got ${bytes}/${md5}`,
    );
  }
}

const sqlFiles = fs
  .readdirSync(root)
  .filter((name) => name.endsWith(".sql"));
if (sqlFiles.length !== manifest.count) {
  failures.push(
    `expected ${manifest.count} SQL files, found ${sqlFiles.length}`,
  );
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Canonical migration archive verified: ${manifest.count}/${manifest.count}`,
);

