// Usage: node child-nodes.js <bestsellers-page.html>
// Prints "<root>/<node id>\t<name>" for every category linked in the bestsellers sidebar.
import fs from "node:fs";
const html = fs.readFileSync(process.argv[2], "utf8");
const seen = new Set();
for (const [, root, id, name] of html.matchAll(/href="\/gp\/bestsellers\/([a-z-]+)\/(\d+)[^"]*"[^>]*>([^<]+)/g)) {
  if (seen.has(id)) continue;
  seen.add(id);
  console.log(`${root}/${id}\t${name.trim()}`);
}
