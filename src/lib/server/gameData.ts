import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reads a file already sitting in `public/data/`, server-side, so a page can
 * hand it to a client component as a prop instead of that component fetching
 * it over the network after mount. Same file the browser would have fetched
 * anyway, this only changes when it arrives.
 */
export function readGameData<T>(file: string): T {
  const filePath = path.join(process.cwd(), "public", "data", file);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}
