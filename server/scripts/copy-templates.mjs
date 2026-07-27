import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "../src/lib/pdf/templates");
const dest = path.resolve(__dirname, "../dist/lib/pdf/templates");

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied ${fs.readdirSync(src).length} PDF template(s) to dist/lib/pdf/templates`);
