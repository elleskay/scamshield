#!/usr/bin/env node
// Orchestrates the spec gate across the JS layers. Resets the shared coverage
// file once, runs the app (jest-expo) and API (vitest) suites pointed at it, then
// runs spec-coverage. The Maestro e2e layer runs in CI (android-emulator) and is
// ingested there via spec-maestro; locally those e2e requirements show uncovered.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const cov = resolve(root, ".spec-coverage", "results.jsonl");
rmSync(resolve(root, ".spec-coverage"), { recursive: true, force: true });

const env = { ...process.env, SPEC_COVERAGE_FILE: cov };

function run(cmd, cwd = root, optional = false) {
  console.log(`\n$ ${cmd}  (cwd: ${cwd})`);
  try {
    execSync(cmd, { stdio: "inherit", env, cwd: resolve(root, cwd) });
    return true;
  } catch {
    if (optional) {
      console.log(`(non-fatal) ${cmd} failed or was skipped`);
      return true;
    }
    return false;
  }
}

let ok = true;
ok = run("npm run build", "packages/spec-test") && ok;
ok = run("npm run test:unit", "apps/app") && ok;
ok = run("npm test", "services/api") && ok;

// Ingest a Maestro JUnit report if a prior e2e step produced one (CI). Locally
// there is usually no device run, so this is absent and simply skipped.
const maestroReport = resolve(root, "apps/app/maestro.xml");
if (existsSync(maestroReport)) {
  run(`node packages/spec-test/dist/maestro.js --report "${maestroReport}"`, root, true);
} else {
  console.log("\n(no apps/app/maestro.xml; e2e runs in CI on an emulator, skipping ingest)");
}

const gate = [
  "node packages/spec-test/dist/cli.js",
  "--spec specs/scamshield.yml",
  `--coverage "${cov}"`,
  "--verification-dir verification",
  "--app-version 0.1.0",
].join(" ");
ok = run(gate) && ok;

process.exit(ok ? 0 : 1);
