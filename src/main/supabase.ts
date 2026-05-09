import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "./db";
import { exportLocalSyncRecords, restoreLocalSyncRecords, type LocalSyncRecord } from "./sync";
import type { CloudLoginInput, CloudStatus, CloudSyncResult } from "../shared/contracts";

const organizationSlug = "vianexo-main";

type StoredCloudSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
  organizationId?: string;
  lastSyncAt?: string;
};

type SupabaseConfig = {
  url: string;
  key: string;
};

let envLoaded = false;

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

function loadEnv() {
  if (envLoaded) return;
  loadEnvFile(path.join(process.cwd(), ".env"));
  if (app.isPackaged) {
    loadEnvFile(path.join(path.dirname(app.getPath("exe")), ".env"));
  }
  envLoaded = true;
}

function getSessionPath() {
  return path.join(app.getPath("userData"), "cloud-session.json");
}

function readStoredSession(): StoredCloudSession | null {
  const sessionPath = getSessionPath();
  if (!fs.existsSync(sessionPath)) return null;
  return JSON.parse(fs.readFileSync(sessionPath, "utf8")) as StoredCloudSession;
}

function writeStoredSession(session: StoredCloudSession) {
  fs.mkdirSync(path.dirname(getSessionPath()), { recursive: true });
  fs.writeFileSync(getSessionPath(), JSON.stringify(session, null, 2));
}

function clearStoredSession() {
  const sessionPath = getSessionPath();
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { force: true });
  }
}

function getConfig(): SupabaseConfig {
  loadEnv();
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no ambiente do ViaNexo.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

function hasConfig() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

async function requestJson<T>(pathName: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const config = getConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", config.key);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${options.accessToken ?? config.key}`);

  const response = await fetch(`${config.url}${pathName}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase respondeu com HTTP ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

async function refreshSessionIfNeeded(session: StoredCloudSession) {
  if (session.expiresAt > Date.now() + 60000) {
    return session;
  }

  const data = await requestJson<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email?: string };
  }>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken })
  });

  const refreshed: StoredCloudSession = {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    userId: data.user.id,
    email: data.user.email ?? session.email
  };
  writeStoredSession(refreshed);
  return refreshed;
}

async function requireCloudSession() {
  const session = readStoredSession();
  if (!session) {
    throw new Error("Entre na nuvem antes de sincronizar.");
  }
  return refreshSessionIfNeeded(session);
}

async function ensureOrganization(session: StoredCloudSession) {
  if (session.organizationId) {
    return session.organizationId;
  }

  const organizations = await requestJson<Array<{ id: string }>>(
    `/rest/v1/organizations?slug=eq.${organizationSlug}&select=id&limit=1`,
    { accessToken: session.accessToken }
  );
  const organizationId = organizations[0]?.id;
  if (!organizationId) {
    throw new Error("Organizacao ViaNexo nao encontrada no Supabase.");
  }

  await requestJson("/rest/v1/organization_members?on_conflict=organization_id,user_id", {
    method: "POST",
    accessToken: session.accessToken,
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      organization_id: organizationId,
      user_id: session.userId,
      role: "owner"
    })
  });

  const nextSession = { ...session, organizationId };
  writeStoredSession(nextSession);
  return organizationId;
}

function toRemoteRecord(organizationId: string, userId: string, record: LocalSyncRecord) {
  return {
    organization_id: organizationId,
    entity: record.entity,
    record_id: record.recordId,
    payload: record.payload,
    source_updated_at: record.sourceUpdatedAt,
    deleted_at: record.deletedAt ?? null,
    updated_by: userId
  };
}

function fromRemoteRecord(record: {
  entity: LocalSyncRecord["entity"];
  record_id: string;
  payload: Record<string, unknown>;
  source_updated_at: string;
  deleted_at?: string | null;
}): LocalSyncRecord {
  return {
    entity: record.entity,
    recordId: record.record_id,
    payload: record.payload,
    sourceUpdatedAt: record.source_updated_at,
    deletedAt: record.deleted_at ?? null
  };
}

export async function cloudLogin(input: CloudLoginInput): Promise<CloudStatus> {
  const data = await requestJson<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email?: string };
  }>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password
    })
  });

  const session: StoredCloudSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    userId: data.user.id,
    email: data.user.email ?? input.email
  };
  const organizationId = await ensureOrganization(session);
  return {
    configured: true,
    connected: true,
    email: session.email,
    organizationId
  };
}

export async function cloudLogout() {
  const session = readStoredSession();
  if (session) {
    await requestJson("/auth/v1/logout", {
      method: "POST",
      accessToken: session.accessToken
    }).catch(() => undefined);
  }
  clearStoredSession();
  return true;
}

export async function getCloudStatus(): Promise<CloudStatus> {
  const configured = hasConfig();
  const session = readStoredSession();
  if (!configured) {
    return { configured: false, connected: false, message: "Supabase nao configurado." };
  }
  if (!session) {
    return { configured: true, connected: false };
  }
  return {
    configured: true,
    connected: true,
    email: session.email,
    organizationId: session.organizationId,
    lastSyncAt: session.lastSyncAt
  };
}

export async function pushLocalToCloud(): Promise<CloudSyncResult> {
  const session = await requireCloudSession();
  const organizationId = await ensureOrganization(session);
  const records = await exportLocalSyncRecords(getPrisma());
  const remoteRecords = records.map((record) => toRemoteRecord(organizationId, session.userId, record));

  if (remoteRecords.length > 0) {
    await requestJson("/rest/v1/sync_records?on_conflict=organization_id,entity,record_id", {
      method: "POST",
      accessToken: session.accessToken,
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(remoteRecords)
    });
  }

  const syncedAt = new Date().toISOString();
  writeStoredSession({ ...session, organizationId, lastSyncAt: syncedAt });
  return {
    pushedRecords: records.length,
    pulledRecords: 0,
    restoredRecords: 0,
    organizationId,
    syncedAt
  };
}

export async function fetchCloudRecords(session?: StoredCloudSession) {
  const activeSession = session ?? await requireCloudSession();
  const organizationId = await ensureOrganization(activeSession);
  const records = await requestJson<Array<{
    entity: LocalSyncRecord["entity"];
    record_id: string;
    payload: Record<string, unknown>;
    source_updated_at: string;
    deleted_at?: string | null;
  }>>(
    `/rest/v1/sync_records?organization_id=eq.${organizationId}&select=entity,record_id,payload,source_updated_at,deleted_at`,
    { accessToken: activeSession.accessToken }
  );
  return { organizationId, records: records.map(fromRemoteRecord), session: activeSession };
}

export async function restoreFromCloud(): Promise<CloudSyncResult & { email: string }> {
  const session = await requireCloudSession();
  const { organizationId, records } = await fetchCloudRecords(session);
  const result = await restoreLocalSyncRecords(getPrisma(), records);
  const syncedAt = new Date().toISOString();
  writeStoredSession({ ...session, organizationId, lastSyncAt: syncedAt });
  return {
    pushedRecords: 0,
    pulledRecords: records.length,
    restoredRecords: result.restoredRecords,
    organizationId,
    syncedAt,
    email: session.email
  };
}

export async function syncCloudNow(): Promise<CloudSyncResult> {
  const pushed = await pushLocalToCloud();
  const restored = await restoreFromCloud();
  return {
    pushedRecords: pushed.pushedRecords,
    pulledRecords: restored.pulledRecords,
    restoredRecords: restored.restoredRecords,
    organizationId: restored.organizationId,
    syncedAt: restored.syncedAt
  };
}
