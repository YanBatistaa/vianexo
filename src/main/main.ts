import { BrowserWindow, app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { configureDatabaseUrl, disconnectPrisma } from "./db";
import { registerIpcHandlers } from "./ipc";

configureDatabaseUrl();

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function logRuntime(message: string) {
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(path.join(logDir, "main.log"), `[${new Date().toISOString()}] ${message}\n`);
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    title: "ViaNexo",
    backgroundColor: "#f6f2ea",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.webContents.on("did-fail-load", (_event, code, description, url) => {
    logRuntime(`did-fail-load ${code} ${description} ${url}`);
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    logRuntime(`render-process-gone ${details.reason} exitCode=${details.exitCode}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logRuntime(`renderer console level=${level} ${message} (${sourceId}:${line})`);
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId("br.com.vianexo.desktop");
  registerIpcHandlers();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
}).catch((error) => {
  logRuntime(error instanceof Error ? error.stack ?? error.message : String(error));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void disconnectPrisma();
});
