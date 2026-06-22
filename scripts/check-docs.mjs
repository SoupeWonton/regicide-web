import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if ([".git", ".claude", ".codex", "node_modules"].includes(entry.name)) return [];
      return markdownFiles(path);
    }
    return /\.md$/i.test(entry.name) ? [path] : [];
  });
}

const files = markdownFiles(root);
const failures = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].replace(/^<|>$/g, "").split("#", 1)[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    const resolved = resolve(dirname(file), target);
    if (!existsSync(resolved)) failures.push(`${file}: broken link ${match[1]}`);
  }
}

const manifest = join(root, "docs", "canon", "README.md");
if (!existsSync(manifest) || !statSync(manifest).isFile()) {
  failures.push("docs/canon/README.md: missing sole canon manifest");
}

const frontMatterRoots = [
  join(root, "docs", "canon", "v3"),
  join(root, "docs", "decisions"),
  join(root, "docs", "delivery"),
];

for (const directory of frontMatterRoots) {
  for (const file of markdownFiles(directory)) {
    if (file.endsWith("README.md")) continue;
    if (!readFileSync(file, "utf8").startsWith("---\n")) {
      failures.push(`${file}: maintained document is missing front matter`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed (${files.length} Markdown files).`);
}
