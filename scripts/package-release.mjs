#!/usr/bin/env node

import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version ?? "0.0.0";
const releaseRoot = path.join(root, "release");
const folderName = `agent-pixels-${version}`;
const packageDir = path.join(releaseRoot, folderName);
const zipName = `${folderName}.zip`;

const zipCheck = spawnSync("zip", ["-v"], { stdio: "ignore" });
if (zipCheck.error || zipCheck.status !== 0) {
  throw new Error("The `zip` binary is required. Install it with your OS package manager, then rerun this command.");
}

await rm(packageDir, { recursive: true, force: true });
await rm(path.join(releaseRoot, zipName), { force: true });
await mkdir(packageDir, { recursive: true });

await cp(path.join(root, "package.json"), path.join(packageDir, "package.json"));
await cp(path.join(root, "README.md"), path.join(packageDir, "README.md"));
await cp(path.join(root, "dist"), path.join(packageDir, "dist"), { recursive: true });

const result = spawnSync("zip", ["-qr", zipName, folderName], {
  cwd: releaseRoot,
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`zip exited with status ${result.status}`);
}

console.log(`Created release/${zipName}`);
