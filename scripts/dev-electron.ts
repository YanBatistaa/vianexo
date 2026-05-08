import { spawn } from "node:child_process";
import { build } from "vite";
import path from "node:path";

async function compileMain() {
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve("src/main/main.ts"),
        formats: ["cjs"],
        fileName: () => "main/main.js"
      },
      outDir: "dist",
      emptyOutDir: false,
      target: "node22",
      rollupOptions: {
        external: ["electron", "bcryptjs", "electron-updater", "node:path", "node:fs"]
      }
    }
  });

  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve("src/preload/preload.ts"),
        formats: ["cjs"],
        fileName: () => "preload/preload.js"
      },
      outDir: "dist",
      emptyOutDir: false,
      target: "node22",
      rollupOptions: {
        external: ["electron"]
      }
    }
  });
}

await compileMain();

const child = spawn("electron", ["."], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "development"
  }
});

child.on("exit", (code) => process.exit(code ?? 0));
