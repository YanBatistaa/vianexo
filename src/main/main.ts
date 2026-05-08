import { BrowserWindow, app } from "electron";
import path from "node:path";
import { configureDatabaseUrl, disconnectPrisma } from "./db";
import { registerIpcHandlers } from "./ipc";

configureDatabaseUrl();

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

async function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    title: "Sistema Vans",
    backgroundColor: "#f6f2ea",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId("br.com.sistemavans.desktop");
  registerIpcHandlers();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void disconnectPrisma();
});
