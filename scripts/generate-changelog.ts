import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

type Section = "Highlights" | "Improvements" | "Fixes";

function git(args: string[]) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function packageVersion() {
  return JSON.parse(fs.readFileSync("package.json", "utf8")).version as string;
}

function lastTag() {
  try {
    return git(["describe", "--tags", "--abbrev=0"]);
  } catch {
    return "";
  }
}

function commitsSince(tag: string) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  return git(["log", range, "--format=%s", "--no-merges"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function sectionFor(message: string): Section {
  const lower = message.toLowerCase();
  if (lower.startsWith("fix") || lower.includes("fix") || lower.includes("corrige")) {
    return "Fixes";
  }
  if (lower.includes("release") || lower.includes("route") || lower.includes("session") || lower.includes("backup")) {
    return "Highlights";
  }
  return "Improvements";
}

function humanize(message: string) {
  return message
    .replace(/^(feat|fix|docs|chore|refactor|test|ci)(\([^)]+\))?:\s*/i, "")
    .replace(/\.$/, "");
}

const versionArg = process.argv.find((arg) => arg.startsWith("--version="));
const channelArg = process.argv.find((arg) => arg.startsWith("--channel="));
const version = versionArg?.split("=")[1] || packageVersion();
const channel = channelArg?.split("=")[1] || "stable";
const tag = lastTag();
const commits = commitsSince(tag);
const date = new Date().toISOString().slice(0, 10);
const grouped: Record<Section, string[]> = {
  Highlights: [],
  Improvements: [],
  Fixes: []
};

for (const commit of commits) {
  grouped[sectionFor(commit)].push(`- ${humanize(commit)}`);
}

const lines = [
  `# ViaNexo ${version}`,
  "",
  `> Canal: ${channel}`,
  `> Data: ${date}`,
  tag ? `> Base: commits desde ${tag}` : "> Base: primeiros commits do repositorio",
  "",
  "## Highlights",
  ...(grouped.Highlights.length ? grouped.Highlights : ["- Nova versao do ViaNexo."]),
  "",
  "## Improvements",
  ...(grouped.Improvements.length ? grouped.Improvements : ["- Ajustes internos de estabilidade e manutencao."]),
  "",
  "## Fixes",
  ...(grouped.Fixes.length ? grouped.Fixes : ["- Sem correcoes isoladas nesta versao."]),
  "",
  "## Upgrade Guide",
  "- Instale pelo instalador publicado na release.",
  "- O app aplica migrations Prisma automaticamente ao abrir.",
  "- Faca backup local antes de restaurar dados antigos.",
  ""
];

const outDir = path.resolve("releases");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `v${version}.md`);
fs.writeFileSync(outFile, lines.join("\n"));
console.log(`Changelog generated: ${path.relative(process.cwd(), outFile)}`);
