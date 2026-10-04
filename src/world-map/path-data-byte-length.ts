import { pathDataByIsoA3 } from "./path-shards";

export function getEmbeddedPathDataByteLength(): number {
  let total = 0;
  for (const paths of Object.values(pathDataByIsoA3)) {
    for (const d of paths) {
      total += Buffer.byteLength(d, "utf8");
    }
  }
  return total;
}
