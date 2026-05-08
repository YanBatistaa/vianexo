import fs from "node:fs";
import path from "node:path";
import { ipcContracts } from "../src/shared/ipc-contracts";

const root = process.cwd();
const preload = fs.readFileSync(path.join(root, "src/preload/preload.ts"), "utf8");
const mainIpc = fs.readFileSync(path.join(root, "src/main/ipc.ts"), "utf8");
const docs = fs.readFileSync(path.join(root, "docs/ipc-contracts.md"), "utf8");

const failures: string[] = [];

for (const [method, contract] of Object.entries(ipcContracts)) {
  const channelRef = `ipcChannels.${method}`;
  if (!preload.includes(`${method}:`) || !preload.includes(channelRef)) {
    failures.push(`preload missing ${method} -> ${contract.channel}`);
  }
  if (!mainIpc.includes(channelRef)) {
    failures.push(`main ipc missing ${method} -> ${contract.channel}`);
  }
  if (!docs.includes(`\`${contract.channel}\``)) {
    failures.push(`docs missing ${contract.channel}`);
  }
}

const channels = Object.values(ipcContracts).map((contract) => contract.channel);
const duplicates = channels.filter((channel, index) => channels.indexOf(channel) !== index);
if (duplicates.length > 0) {
  failures.push(`duplicate channels: ${[...new Set(duplicates)].join(", ")}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`IPC contract test ok: ${channels.length} channels.`);
