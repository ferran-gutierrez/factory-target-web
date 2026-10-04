import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 60;
const assetsDir = path.join(process.cwd(), "dist", "assets");

async function builtJsFiles() {
  try {
    return (await readdir(assetsDir)).filter((name) => name.endsWith(".js"));
  } catch {
    return [];
  }
}

const files = await builtJsFiles();

if (files.length === 0) {
  console.error("check:size: no JavaScript files in dist/assets; run npm run build first");
  process.exitCode = 1;
} else {
  let gzipBytes = 0;
  for (const name of files) {
    gzipBytes += gzipSync(await readFile(path.join(assetsDir, name))).length;
  }
  const measured = `${(gzipBytes / 1024).toFixed(1)} KB`;
  if (gzipBytes > BUDGET_KB * 1024) {
    console.error(`check:size: ${measured} gzip across ${files.length} JS file(s) exceeds the ${BUDGET_KB} KB budget`);
    process.exitCode = 1;
  } else {
    console.log(`check:size: ${measured} gzip across ${files.length} JS file(s) is within the ${BUDGET_KB} KB budget`);
  }
}
