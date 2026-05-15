import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const buildIdFile = path.join(nextDir, "BUILD_ID");
const appManifest = path.join(nextDir, "server", "app-paths-manifest.json");
const pagesManifest = path.join(nextDir, "server", "pages-manifest.json");
const force = process.argv.includes("--force");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function removeNextCache(reason) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log(`[rook] repaired Next cache: ${reason}`);
}

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

if (force) {
  removeNextCache("forced cleanup");
  process.exit(0);
}

const appPaths = readJson(appManifest);
const pages = readJson(pagesManifest);
const hasAppSource = fs.existsSync(path.join(process.cwd(), "src", "app"));
const appManifestIsEmpty = hasAppSource && appPaths && Object.keys(appPaths).length === 0;
const pagesManifestMissingApp = pages && Object.keys(pages).length > 0 && !pages["/_app"];
const hasProductionBuild = fs.existsSync(buildIdFile);

if (appManifestIsEmpty || pagesManifestMissingApp || hasProductionBuild) {
  removeNextCache(
    appManifestIsEmpty
      ? "empty App Router manifest"
      : pagesManifestMissingApp
        ? "missing Pages Router compatibility entries"
        : "stale production build artifact",
  );
}
