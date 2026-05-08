import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  Bus,
  Check,
  DatabaseBackup,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  GripVertical,
  HelpCircle,
  LogOut,
  MapPinned,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  Wrench,
  X
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import * as XLSX from "xlsx";
import { createFullPermissionMatrix, createViewOnlyPermissionMatrix, hasPermission } from "../shared/permissions";
import type {
  EmployeeImportRow,
  PermissionMatrix,
  SessionUser,
  UpdateCheckResult
} from "../shared/contracts";
import "./styles/app.css";

type ModuleKey = "dashboard" | "clients" | "employees" | "vehicles" | "drivers" | "imports" | "routes" | "users" | "settings";

const api = window.sistemaVans;
const appName = "ViaNexo";

const emptyClient = { id: "", name: "", document: "", contact: "", phone: "", email: "", notes: "" };
const emptyDriver = { id: "", name: "", phone: "", document: "", notes: "" };
const emptyVehicle = { id: "", label: "", plate: "", capacity: 15, status: "ACTIVE", notes: "", driverName: "" };
const emptyUser = { id: "", name: "", email: "", password: "", status: "ACTIVE", permissions: createViewOnlyPermissionMatrix() as PermissionMatrix };
const unrestrictedModules = new Set<ModuleKey>(["dashboard", "settings"]);

const navItems: Array<{ key: ModuleKey; label: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Painel", icon: Archive },
  { key: "clients", label: "Clientes", icon: UsersRound },
  { key: "employees", label: "Funcionarios", icon: UserRound },
  { key: "vehicles", label: "Frota", icon: Bus },
  { key: "drivers", label: "Motoristas", icon: Shield },
  { key: "imports", label: "Importacoes", icon: FileSpreadsheet },
  { key: "routes", label: "Rotas", icon: MapPinned },
  { key: "users", label: "Usuarios", icon: Wrench },
  { key: "settings", label: "Configuracoes", icon: Settings }
];

function useAsyncData<T>(loader: () => Promise<T>, deps: React.DependencyList, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loader()
      .then((result) => mounted && setData(result))
      .catch(() => mounted && setData(fallback))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // The caller owns the dependency list so this compact loader can be reused by every module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading };
}

function can(user: SessionUser, module: string, action: string) {
  return hasPermission(user.permissions, module as any, action as any);
}

function matchesSearch(value: unknown, search: string) {
  return JSON.stringify(value ?? "").toLowerCase().includes(search.trim().toLowerCase());
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName.replace(/[^\w.-]+/g, "-").toLowerCase()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function routeSearchPayload(route: any) {
  return {
    name: route.name,
    client: route.client?.name,
    status: route.status,
    date: route.date,
    vehicles: route.vehicles?.map((routeVehicle: any) => ({
      label: routeVehicle.vehicle?.label,
      plate: routeVehicle.vehicle?.plate,
      driver: routeVehicle.driver?.name,
      passengers: routeVehicle.passengers?.map((passenger: any) => ({
        name: passenger.employee?.name,
        client: passenger.employee?.client?.name,
        address: passenger.employee?.address,
        destination: passenger.employee?.destination
      }))
    }))
  };
}

function SetupScreen({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.setupAdmin(form);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o administrador.");
    }
  }

  return (
    <main className="setup-shell">
      <section className="setup-panel">
        <BrandMark />
        <h1>{appName}</h1>
        <p>Crie o primeiro administrador para liberar a operacao local.</p>
        <form onSubmit={submit} className="stack-form">
          <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Input label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
          {error && <p className="error-line">{error}</p>}
          <button className="primary-button" type="submit">
            <Check size={18} /> Criar administrador
          </button>
        </form>
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onLogin(await api.login(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
    }
  }

  return (
    <main className="setup-shell">
      <section className="setup-panel">
        <BrandMark />
        <h1>{appName}</h1>
        <p>Entre para acessar a central operacional.</p>
        <form onSubmit={submit} className="stack-form">
          <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Input label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
          {error && <p className="error-line">{error}</p>}
          <button className="primary-button" type="submit">
            <Check size={18} /> Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({ user, onLogout }: { user: SessionUser; onLogout: () => void | Promise<void> }) {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updateState, setUpdateState] = useState<UpdateCheckResult | null>(null);
  const [updateHidden, setUpdateHidden] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const clients = useAsyncData(() => api.listClients(), [refreshKey], []);
  const employees = useAsyncData(() => api.listEmployees(), [refreshKey], []);
  const vehicles = useAsyncData(() => api.listVehicles(), [refreshKey], []);
  const drivers = useAsyncData(() => api.listDrivers(), [refreshKey], []);
  const users = useAsyncData(() => api.listUsers(), [refreshKey], []);
  const routes = useAsyncData(() => api.listRoutes(), [refreshKey], []);

  const visibleNavItems = navItems.filter((item) => unrestrictedModules.has(item.key) || can(user, item.key, "view"));

  const context = {
    user,
    clients: clients.data,
    employees: employees.data,
    vehicles: vehicles.data,
    drivers: drivers.data,
    users: users.data,
    routes: routes.data,
    refresh: () => setRefreshKey((value) => value + 1),
    notify: (message: string, tone: "success" | "error" = "success") => {
      setToast({ message, tone });
      window.setTimeout(() => setToast(null), 3600);
    },
    showUpdate: (update: UpdateCheckResult) => {
      setUpdateState(update);
      setUpdateHidden(false);
    },
    onLogout
  };

  useEffect(() => {
    let mounted = true;
    api.checkForUpdates().then((result) => {
      if (mounted && result.status === "available") {
        setUpdateState(result);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function installUpdateNow() {
    setInstallingUpdate(true);
    const result = await api.downloadAndInstallUpdate();
    if (result.status === "error") {
      setUpdateState((state) => state ? { ...state, status: "error", message: result.message } : null);
      setInstallingUpdate(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark compact />
          <div>
            <strong>{appName}</strong>
            <small>Central de fretamento</small>
          </div>
        </div>
        <nav>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => setActive(item.key)}>
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <small>Logado como</small>
          <strong>{user.name}</strong>
        </div>
      </aside>
      <main className="content">
        {active === "dashboard" && <Dashboard {...context} />}
        {active === "clients" && <ClientsModule {...context} />}
        {active === "employees" && <EmployeesModule {...context} />}
        {active === "vehicles" && <VehiclesModule {...context} />}
        {active === "drivers" && <DriversModule {...context} />}
        {active === "imports" && <ImportsModule {...context} />}
        {active === "routes" && <RoutesModule {...context} />}
        {active === "users" && <UsersModule {...context} />}
        {active === "settings" && <SettingsModule {...context} />}
      </main>
      {updateState && !updateHidden && (
        <UpdatePrompt
          update={updateState}
          installing={installingUpdate}
          onInstall={installUpdateNow}
          onLater={() => setUpdateHidden(true)}
        />
      )}
      {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "brand-mark compact" : "brand-mark"}>VN</div>;
}

function PageHeader({ title, eyebrow, help, action }: { title: string; eyebrow: string; help?: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span>{eyebrow}</span>
        <div className="title-row">
          <h2>{title}</h2>
          {help && (
            <button className="help-button" title={help} aria-label={`Ajuda: ${title}`}>
              <HelpCircle size={18} />
            </button>
          )}
        </div>
      </div>
      {action}
    </header>
  );
}

function Dashboard(context: any) {
  const occupancy = context.vehicles.reduce((sum: number, vehicle: any) => sum + Number(vehicle.capacity), 0);
  return (
    <>
      <PageHeader
        eyebrow="Visao geral"
        title="Operacao do dia sob controle"
        help="Use o painel para enxergar rapidamente clientes, funcionarios importados, frota e roteiros recentes."
        action={<BackupButton user={context.user} />}
      />
      <section className="metric-grid">
        <Metric label="Clientes" value={context.clients.length} tone="ink" />
        <Metric label="Funcionarios" value={context.employees.length} tone="green" />
        <Metric label="Veiculos ativos" value={context.vehicles.filter((v: any) => v.status === "ACTIVE").length} tone="amber" />
        <Metric label="Lugares cadastrados" value={occupancy} tone="red" />
      </section>
      <section className="work-board">
        <div>
          <h3>Roteiros recentes</h3>
          <DataTable
            columns={["Nome", "Cliente", "Data", "Status"]}
            rows={context.routes.slice(0, 6).map((route: any) => [
              route.name,
              route.client?.name,
              new Date(route.date).toLocaleDateString("pt-BR"),
              route.status
            ])}
          />
        </div>
        <div>
          <h3>Frota</h3>
          <DataTable
            columns={["Veiculo", "Placa", "Cap.", "Status"]}
            rows={context.vehicles.slice(0, 6).map((vehicle: any) => [
              vehicle.label,
              vehicle.plate ?? "-",
              vehicle.capacity,
              vehicle.status
            ])}
          />
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function BackupButton({ user }: { user: SessionUser }) {
  const [message, setMessage] = useState("");
  if (!can(user, "settings", "create")) return null;
  return (
    <div className="inline-action">
      {message && <span>{message}</span>}
      <button className="secondary-button" onClick={async () => {
        const result = await api.createBackup();
        setMessage(`Backup criado em ${result.filePath}`);
      }}>
        <DatabaseBackup size={17} /> Backup
      </button>
    </div>
  );
}

function ClientsModule({ clients, refresh, user, notify }: any) {
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState("");
  const editing = Boolean(form.id);
  const rows = clients.filter((client: any) => matchesSearch(client, search));
  return (
    <>
      <PageHeader eyebrow="Cadastro" title="Clientes contratantes" help="Cadastre empresas contratantes. A edicao reutiliza o mesmo formulario apos clicar no icone de lapis." />
      {can(user, "clients", editing ? "edit" : "create") && <EditorPanel title={editing ? "Editar cliente" : "Novo cliente"} onCancel={editing ? () => setForm(emptyClient) : undefined} onSubmit={async () => {
        await api.saveClient(form);
        setForm(emptyClient);
        refresh();
        notify(editing ? "Cliente atualizado." : "Cliente cadastrado.");
      }}>
        <Input label="Empresa" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Documento" value={form.document} onChange={(document) => setForm({ ...form, document })} required={false} />
        <Input label="Contato" value={form.contact} onChange={(contact) => setForm({ ...form, contact })} required={false} />
        <Input label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required={false} />
      </EditorPanel>}
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar por empresa, contato ou telefone" />
      <DataSection
        columns={["Empresa", "Contato", "Telefone", "Funcionarios", "Rotas", "Acoes"]}
        rows={rows.map((client: any) => [
          client.name,
          client.contact ?? "-",
          client.phone ?? "-",
          client._count?.employees ?? 0,
          client._count?.routes ?? 0,
          <RowActions key={client.id} canEdit={can(user, "clients", "edit")} canDelete={can(user, "clients", "delete")} onEdit={() => setForm({ ...emptyClient, ...client })} onDelete={async () => { await api.deleteClient(client.id); refresh(); notify("Cliente excluido."); }} />
        ])}
      />
    </>
  );
}

function DriversModule({ drivers, refresh, user, notify }: any) {
  const [form, setForm] = useState(emptyDriver);
  const [search, setSearch] = useState("");
  const editing = Boolean(form.id);
  const rows = drivers.filter((driver: any) => matchesSearch(driver, search));
  return (
    <>
      <PageHeader eyebrow="Frota" title="Motoristas" help="Motoristas podem ser cadastrados aqui ou diretamente na tela de Frota ao digitar um nome novo." />
      {can(user, "drivers", editing ? "edit" : "create") && <EditorPanel title={editing ? "Editar motorista" : "Novo motorista"} onCancel={editing ? () => setForm(emptyDriver) : undefined} onSubmit={async () => {
        await api.saveDriver(form);
        setForm(emptyDriver);
        refresh();
        notify(editing ? "Motorista atualizado." : "Motorista cadastrado.");
      }}>
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required={false} />
        <Input label="Documento" value={form.document} onChange={(document) => setForm({ ...form, document })} required={false} />
      </EditorPanel>}
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar motoristas" />
      <DataSection
        columns={["Nome", "Telefone", "Documento", "Veiculos", "Acoes"]}
        rows={rows.map((driver: any) => [
          driver.name,
          driver.phone ?? "-",
          driver.document ?? "-",
          driver.vehicles?.map((item: any) => item.vehicle.label).join(", ") || "-",
          <RowActions key={driver.id} canEdit={can(user, "drivers", "edit")} canDelete={can(user, "drivers", "delete")} onEdit={() => setForm({ ...emptyDriver, ...driver })} onDelete={async () => { await api.deleteDriver(driver.id); refresh(); notify("Motorista excluido."); }} />
        ])}
      />
    </>
  );
}

function VehiclesModule({ vehicles, drivers, refresh, user, notify }: any) {
  const [form, setForm] = useState(emptyVehicle);
  const [search, setSearch] = useState("");
  const editing = Boolean(form.id);
  const rows = vehicles.filter((vehicle: any) => matchesSearch(vehicle, search));
  return (
    <>
      <PageHeader eyebrow="Frota" title="Veiculos e capacidades" help="Digite um motorista novo ou escolha um existente na lista suspensa. Se o nome nao existir, ele sera criado automaticamente." />
      {can(user, "vehicles", editing ? "edit" : "create") && <EditorPanel title={editing ? "Editar veiculo" : "Novo veiculo"} onCancel={editing ? () => setForm(emptyVehicle) : undefined} onSubmit={async () => {
        await api.saveVehicle(form as any);
        setForm(emptyVehicle);
        refresh();
        notify(editing ? "Veiculo atualizado." : "Veiculo cadastrado. Motorista novo, se informado, tambem foi salvo.");
      }}>
        <Input label="Identificacao" value={form.label} onChange={(label) => setForm({ ...form, label })} />
        <Input label="Placa" value={form.plate} onChange={(plate) => setForm({ ...form, plate })} required={false} />
        <Input label="Capacidade" type="number" value={String(form.capacity)} onChange={(capacity) => setForm({ ...form, capacity: Number(capacity) })} />
        <label>
          Motorista
          <input list="drivers-list" value={form.driverName} onChange={(event) => setForm({ ...form, driverName: event.target.value })} placeholder="Digite ou escolha um motorista" />
          <datalist id="drivers-list">
            {drivers.map((driver: any) => <option key={driver.id} value={driver.name} />)}
          </datalist>
        </label>
      </EditorPanel>}
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar veiculos, placas ou motoristas" />
      <DataSection
        columns={["Veiculo", "Placa", "Capacidade", "Status", "Motoristas", "Acoes"]}
        rows={rows.map((vehicle: any) => [
          vehicle.label,
          vehicle.plate ?? "-",
          vehicle.capacity,
          vehicle.status,
          vehicle.drivers?.map((item: any) => item.driver.name).join(", ") || "-",
          <RowActions key={vehicle.id} canEdit={can(user, "vehicles", "edit")} canDelete={can(user, "vehicles", "delete")} onEdit={() => setForm({
            ...emptyVehicle,
            ...vehicle,
            driverName: vehicle.drivers?.[0]?.driver?.name ?? ""
          })} onDelete={async () => { await api.deleteVehicle(vehicle.id); refresh(); notify("Veiculo excluido."); }} />
        ])}
      />
    </>
  );
}

function EmployeesModule({ employees, clients }: any) {
  const [clientId, setClientId] = useState("");
  const [search, setSearch] = useState("");
  const filtered = (clientId ? employees.filter((employee: any) => employee.clientId === clientId) : employees).filter((employee: any) => matchesSearch(employee, search));
  return (
    <>
      <PageHeader eyebrow="Base importada" title="Funcionarios por cliente" help="Use o filtro para consultar uma empresa especifica ou mantenha Todos para ver toda a base importada." />
      <div className="toolbar">
        <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar funcionarios, clientes, enderecos ou destinos" />
      <DataSection
        columns={["Nome", "Cliente", "Endereco", "Destino", "Telefone", "Extras"]}
        rows={filtered.map((employee: any) => [
          employee.name,
          employee.client?.name,
          employee.address ?? "-",
          employee.destination ?? "-",
          employee.phone ?? "-",
          Object.keys(JSON.parse(employee.extraData || "{}")).join(", ") || "-"
        ])}
      />
    </>
  );
}

function ImportsModule({ clients, employees, refresh, user, notify }: any) {
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("modelo-manual.xlsx");
  const [map, setMap] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("Padrao");
  const [updateExisting, setUpdateExisting] = useState(false);
  const columns = Object.keys(rows[0] ?? {});
  const validation = useMemo(() => {
    const normalizedName = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    const existingNames = new Set(
      employees
        .filter((employee: any) => employee.clientId === clientId)
        .map((employee: any) => normalizedName(employee.name))
        .filter(Boolean)
    );
    const names = rows.map((row) => normalizedName(row[map.name]));
    const counts = names.reduce((acc, name) => {
      if (name) acc.set(name, (acc.get(name) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
    const missingNameRows: number[] = [];
    const duplicateRows: number[] = [];
    const existingRows: number[] = [];
    names.forEach((name, index) => {
      if (!name) {
        missingNameRows.push(index + 1);
        return;
      }
      if ((counts.get(name) ?? 0) > 1) duplicateRows.push(index + 1);
      if (existingNames.has(name)) existingRows.push(index + 1);
    });
    const blockedRows = new Set([...missingNameRows, ...duplicateRows, ...(updateExisting ? [] : existingRows)]);
    return {
      validRows: rows.length - blockedRows.size,
      missingNameRows,
      duplicateRows,
      existingRows
    };
  }, [rows, map.name, employees, clientId, updateExisting]);

  useEffect(() => {
    if (!clientId) {
      setTemplates([]);
      return;
    }
    api.listImportTemplates(clientId).then(setTemplates);
  }, [clientId]);

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    setRows(json);
  }

  function seedRows() {
    setRows([
      { Nome: "Ana Silva", Bairro: "Centro", Destino: "Galpao A", Telefone: "11999990000", Turno: "Manha" },
      { Nome: "Bruno Costa", Bairro: "Jardim Norte", Destino: "Galpao A", Telefone: "11988880000", Turno: "Noite" },
      { Nome: "Carla Ramos", Bairro: "Vila Nova", Destino: "Sede", Telefone: "11977770000", Turno: "Manha" }
    ]);
  }

  async function importNow() {
    const blockedRows = new Set([
      ...validation.missingNameRows,
      ...validation.duplicateRows,
      ...(updateExisting ? [] : validation.existingRows)
    ]);
    const payloadRows: EmployeeImportRow[] = rows.map((row, index) => {
      if (blockedRows.has(index + 1)) return null;
      const used = new Set(Object.values(map));
      const extraData = Object.fromEntries(Object.entries(row).filter(([key]) => !used.has(key)));
      return {
        name: String(row[map.name] ?? "").trim(),
        address: map.address ? String(row[map.address] ?? "").trim() : undefined,
        destination: map.destination ? String(row[map.destination] ?? "").trim() : undefined,
        phone: map.phone ? String(row[map.phone] ?? "").trim() : undefined,
        notes: map.notes ? String(row[map.notes] ?? "").trim() : undefined,
        extraData
      };
    }).filter(Boolean) as EmployeeImportRow[];

    await api.importEmployees({ clientId, fileName, columnMap: map, rows: payloadRows, rawPreview: rows.slice(0, 5), updateExisting });
    setRows([]);
    setMap({});
    refresh();
    notify(`${payloadRows.length} funcionarios importados.`);
  }

  function saveTemplate() {
    if (!clientId) return;
    api.saveImportTemplate({ clientId, name: templateName, columnMap: map }).then(async () => {
      setTemplates(await api.listImportTemplates(clientId));
      notify("Template de mapeamento salvo para este cliente.");
    });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTemplateName(template.name);
    setMap(JSON.parse(template.columnMap || "{}"));
  }

  return (
    <>
      <PageHeader eyebrow="Planilhas" title="Importacao com mapeamento" help="Escolha a planilha, selecione o cliente e diga qual coluna corresponde a cada campo. Colunas nao mapeadas ficam guardadas como extras." />
      <section className="import-grid">
        <div className="panel">
          <h3>Arquivo e cliente</h3>
          <label>
            Cliente
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Selecione</option>
              {clients.map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label className="file-drop">
            <Upload size={22} />
            <span>Selecionar Excel/CSV</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
          <button className="secondary-button" onClick={seedRows}><FileSpreadsheet size={17} /> Usar dados simulados</button>
          <label>
            Template salvo
            <select value="" disabled={!clientId || templates.length === 0} onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">Selecionar template</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
        </div>
        <div className="panel">
          <h3>Mapeamento</h3>
          {["name", "address", "destination", "phone", "notes"].map((field) => (
            <label key={field}>
              {field}
              <select value={map[field] ?? ""} onChange={(event) => setMap({ ...map, [field]: event.target.value })}>
                <option value="">Ignorar</option>
                {columns.map((column) => <option key={column} value={column}>{column}</option>)}
              </select>
            </label>
          ))}
          {rows.length > 0 && <div className={validation.missingNameRows.length || validation.duplicateRows.length || validation.existingRows.length ? "validation-card error" : "validation-card"}>
            <strong>{validation.validRows} linhas validas</strong>
            {validation.missingNameRows.length > 0 && <span>Linhas sem nome ignoradas: {validation.missingNameRows.slice(0, 8).join(", ")}</span>}
            {validation.duplicateRows.length > 0 && <span>Duplicados na planilha ignorados: {validation.duplicateRows.slice(0, 8).join(", ")}</span>}
            {validation.existingRows.length > 0 && <span>{updateExisting ? "Ja cadastrados serao atualizados" : "Ja cadastrados para o cliente ignorados"}: {validation.existingRows.slice(0, 8).join(", ")}</span>}
          </div>}
          <label className="check-row">
            <input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} />
            Atualizar funcionarios existentes pelo nome
          </label>
          <label>
            Nome do template
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          </label>
          <button className="secondary-button" disabled={!clientId || !map.name} onClick={saveTemplate}>
            <Save size={17} /> Salvar template
          </button>
          <button className="primary-button" disabled={!can(user, "imports", "create") || !clientId || !map.name || rows.length === 0 || validation.validRows === 0} onClick={importNow}>
            <Save size={17} /> Importar {rows.length || ""} linhas
          </button>
        </div>
      </section>
      <DataSection
        columns={["Linha", "Status", ...columns]}
        rows={rows.slice(0, 12).map((row, index) => {
          const line = index + 1;
          const issues = [
            validation.missingNameRows.includes(line) ? "sem nome" : "",
            validation.duplicateRows.includes(line) ? "duplicado" : "",
            validation.existingRows.includes(line) ? (updateExisting ? "atualizar" : "ja cadastrado") : ""
          ].filter(Boolean).join(", ") || "ok";
          return [line, issues, ...columns.map((column) => String(row[column] ?? ""))];
        })}
      />
    </>
  );
}

type RouteCard = {
  instanceId: string;
  routeId?: string;
  vehicleId: string;
  name: string;
  driverId?: string;
  employeeIds: string[];
  status: "DRAFT" | "FINAL";
};

type EmployeeDragData = {
  employeeId: string;
  fromCardId?: string;
};

function EmployeeDragItem({ id, employee, fromCardId, children, className = "" }: {
  id: string;
  employee: any;
  fromCardId?: string;
  children: (props: { attributes: any; listeners: any; isDragging: boolean }) => React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { employeeId: employee.id, fromCardId } satisfies EmployeeDragData
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

function RouteDropCard({ card, vehicle, drivers, employees, over, updateCard, removeCard, duplicateCard, moveEmployee, removeEmployee }: {
  card: RouteCard;
  vehicle: any;
  drivers: any[];
  employees: any[];
  over: boolean;
  updateCard: (instanceId: string, updater: (card: RouteCard) => RouteCard) => void;
  removeCard: (instanceId: string) => void;
  duplicateCard: (card: RouteCard) => void;
  moveEmployee: (instanceId: string, employeeId: string, direction: -1 | 1) => void;
  removeEmployee: (instanceId: string, employeeId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `route-card:${card.instanceId}`,
    data: { cardId: card.instanceId }
  });

  return (
    <article ref={setNodeRef} className={`route-card ${over ? "over" : ""} ${isOver ? "drop-target" : ""}`}>
      <header>
        <input value={card.name} onChange={(event) => updateCard(card.instanceId, (current) => ({ ...current, name: event.target.value }))} />
        <span>{card.employeeIds.length}/{vehicle?.capacity ?? 0}</span>
      </header>
      <label>
        Motorista
        <select value={card.driverId ?? ""} onChange={(event) => updateCard(card.instanceId, (current) => ({ ...current, driverId: event.target.value }))}>
          <option value="">Sem motorista</option>
          {drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
        </select>
      </label>
      <ul aria-label={`Passageiros de ${card.name}`}>
        {card.employeeIds.length === 0 && <li className="empty-drop">Solte funcionarios aqui</li>}
        {card.employeeIds.map((id, index) => {
          const employee = employees.find((item: any) => item.id === id);
          if (!employee) return null;
          return (
            <li key={id}>
              <EmployeeDragItem id={`assigned:${card.instanceId}:${id}`} employee={employee} fromCardId={card.instanceId} className="draggable-passenger">
                {({ attributes, listeners }) => (
                  <>
                    <button className="drag-handle" type="button" title="Arrastar passageiro" aria-label={`Arrastar ${employee.name}`} {...attributes} {...listeners}>
                      <GripVertical size={16} />
                    </button>
                    <span>{employee.name}<small>{employee.client?.name}</small></span>
                    <div className="passenger-actions">
                      <button type="button" title="Subir" disabled={index === 0} onClick={() => moveEmployee(card.instanceId, id, -1)}><ArrowUp size={14} /></button>
                      <button type="button" title="Descer" disabled={index === card.employeeIds.length - 1} onClick={() => moveEmployee(card.instanceId, id, 1)}><ArrowDown size={14} /></button>
                      <button type="button" onClick={() => removeEmployee(card.instanceId, id)}>remover</button>
                    </div>
                  </>
                )}
              </EmployeeDragItem>
            </li>
          );
        })}
      </ul>
      <button className="secondary-button" onClick={() => removeCard(card.instanceId)}>
        <X size={17} /> Remover card
      </button>
      <button className="secondary-button" onClick={() => duplicateCard(card)}>
        <Plus size={17} /> Duplicar card
      </button>
    </article>
  );
}

function RoutesModule({ clients, employees, vehicles, drivers, routes, refresh, user, notify }: any) {
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cards, setCards] = useState<RouteCard[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );
  const filteredEmployees = (clientId ? employees.filter((employee: any) => employee.clientId === clientId) : employees).filter((employee: any) => matchesSearch(employee, employeeSearch));
  const selectedEmployeeIds = useMemo(() => new Set(cards.flatMap((card) => card.employeeIds)), [cards]);
  const availableEmployees = filteredEmployees.filter((employee: any) => !selectedEmployeeIds.has(employee.id));
  const activeEmployee = employees.find((employee: any) => employee.id === activeEmployeeId);
  const searchedRoutes = routes.filter((route: any) => matchesSearch(routeSearchPayload(route), historySearch));

  function addVehicleCard(vehicle: any) {
    const count = cards.filter((card) => card.vehicleId === vehicle.id).length + 1;
    setCards([...cards, {
      instanceId: `${vehicle.id}-${Date.now()}-${count}`,
      vehicleId: vehicle.id,
      name: `${vehicle.label} - Rota ${count}`,
      driverId: vehicle.drivers?.[0]?.driverId ?? "",
      employeeIds: [],
      status: "FINAL"
    }]);
  }

  function updateCard(instanceId: string, updater: (card: RouteCard) => RouteCard) {
    setCards(cards.map((card) => card.instanceId === instanceId ? updater(card) : card));
  }

  function removeEmployee(instanceId: string, employeeId: string) {
    updateCard(instanceId, (current) => ({ ...current, employeeIds: current.employeeIds.filter((id) => id !== employeeId) }));
  }

  function moveEmployee(instanceId: string, employeeId: string, direction: -1 | 1) {
    updateCard(instanceId, (current) => {
      const index = current.employeeIds.indexOf(employeeId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.employeeIds.length) {
        return current;
      }
      const employeeIds = [...current.employeeIds];
      const [moved] = employeeIds.splice(index, 1);
      employeeIds.splice(nextIndex, 0, moved);
      return { ...current, employeeIds };
    });
  }

  function duplicateCard(card: RouteCard) {
    setCards([...cards, {
      ...card,
      instanceId: `${card.vehicleId}-${Date.now()}-copy`,
      routeId: undefined,
      name: `${card.name} copia`,
      employeeIds: []
    }]);
  }

  function printRoutes() {
    window.print();
  }

  function exportCardsCsv(exportCards = cards, name = `rotas-${date}`, exportDate = date) {
    if (exportCards.length === 0) return;
    const rows = [
      ["Data", "Rota", "Veiculo", "Motorista", "Ordem", "Funcionario", "Cliente", "Bairro", "Destino", "Telefone"]
    ];
    exportCards.forEach((card) => {
      const vehicle = vehicles.find((item: any) => item.id === card.vehicleId);
      const driver = drivers.find((item: any) => item.id === card.driverId);
      card.employeeIds.forEach((employeeId, index) => {
        const employee = employees.find((item: any) => item.id === employeeId);
        rows.push([
          exportDate,
          card.name,
          vehicle?.label ?? "",
          driver?.name ?? "",
          String(index + 1),
          employee?.name ?? "",
          employee?.client?.name ?? "",
          employee?.address ?? "",
          employee?.destination ?? "",
          employee?.phone ?? ""
        ]);
      });
      if (card.employeeIds.length === 0) {
        rows.push([exportDate, card.name, vehicle?.label ?? "", driver?.name ?? "", "", "", "", "", "", ""]);
      }
    });
    downloadCsv(name, rows);
  }

  function exportSavedRoute(route: any) {
    const exportDate = new Date(route.date).toISOString().slice(0, 10);
    const exportCards = route.vehicles?.map((routeVehicle: any, index: number) => ({
      instanceId: `${route.id}-${routeVehicle.id}`,
      routeId: route.id,
      vehicleId: routeVehicle.vehicleId,
      name: routeVehicle.groupName || route.name || `Rota ${index + 1}`,
      driverId: routeVehicle.driverId ?? "",
      employeeIds: routeVehicle.passengers?.map((item: any) => item.employeeId) ?? [],
      status: route.status
    })) ?? [];
    exportCardsCsv(exportCards, route.name || `rota-${exportDate}`, exportDate);
  }

  function loadRoute(route: any) {
    if (!route.vehicles?.length) return;
    setDate(new Date(route.date).toISOString().slice(0, 10));
    setClientId(route.client?.name === "Rotas multiclientes" ? "" : route.clientId);
    setCards(route.vehicles.map((routeVehicle: any, index: number) => ({
      instanceId: `${route.id}-${routeVehicle.id}-${Date.now()}`,
      routeId: index === 0 ? route.id : undefined,
      vehicleId: routeVehicle.vehicleId,
      name: routeVehicle.groupName || route.name,
      driverId: routeVehicle.driverId ?? "",
      employeeIds: routeVehicle.passengers?.map((item: any) => item.employeeId) ?? [],
      status: route.status
    })));
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as EmployeeDragData | undefined;
    setActiveEmployeeId(data?.employeeId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as EmployeeDragData | undefined;
    const targetCardId = event.over?.data.current?.cardId as string | undefined;
    setActiveEmployeeId(null);
    if (!data || !targetCardId) return;

    setCards((currentCards) => {
      const withoutEmployee = currentCards.map((card) => (
        data.fromCardId
          ? { ...card, employeeIds: card.employeeIds.filter((id) => id !== data.employeeId) }
          : card
      ));

      return withoutEmployee.map((card) => {
        if (card.instanceId !== targetCardId || card.employeeIds.includes(data.employeeId)) {
          return card;
        }
        return { ...card, employeeIds: [...card.employeeIds, data.employeeId] };
      });
    });
  }

  async function saveBatch(status: "DRAFT" | "FINAL") {
    const hasExistingRoute = cards.some((card) => card.routeId);
    if (!can(user, "routes", hasExistingRoute ? "edit" : "create")) {
      notify("Seu usuario nao tem permissao para salvar rotas.", "error");
      return;
    }
    await api.saveRouteBatch({
      clientId: clientId || undefined,
      date,
      routes: cards.map((card) => ({ ...card, status }))
    });
    setCards([]);
    refresh();
    notify(status === "FINAL" ? "Rotas salvas como versao final." : "Rotas salvas como rascunho.");
  }

  return (
    <>
      <PageHeader eyebrow="Wizard assistido" title="Rotas em lote" help="A aba cliente inicia em Todos para permitir misturar funcionarios de empresas diferentes. Cada clique em um veiculo cria um novo card de roteiro, mesmo se for o mesmo veiculo." />
      <section className="route-layout">
        <div className="panel route-controls">
          <Input label="Data" type="date" value={date} onChange={setDate} />
          <label>
            Cliente
            <select value={clientId} onChange={(event) => {
              setClientId(event.target.value);
              setCards(cards.map((card) => ({ ...card, employeeIds: [] })));
            }}>
              <option value="">Todos</option>
              {clients.filter((client: any) => client.name !== "Rotas multiclientes").map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <h3>Adicionar veiculo</h3>
          <div className="vehicle-picks">
            {vehicles.map((vehicle: any) => (
              <button key={vehicle.id} onClick={() => addVehicleCard(vehicle)}>
                {vehicle.label}<small>{vehicle.capacity} lugares</small>
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={cards.length === 0 || !can(user, "routes", cards.some((card) => card.routeId) ? "edit" : "create")} onClick={() => saveBatch("FINAL")}>
            <Save size={17} /> Salvar todos
          </button>
          <button className="secondary-button" disabled={cards.length === 0 || !can(user, "routes", cards.some((card) => card.routeId) ? "edit" : "create")} onClick={() => saveBatch("DRAFT")}>
            <Archive size={17} /> Salvar rascunho
          </button>
          <button className="secondary-button" disabled={cards.length === 0} onClick={printRoutes}>
            <FileSpreadsheet size={17} /> Imprimir lista
          </button>
          <button className="secondary-button" disabled={cards.length === 0} onClick={() => exportCardsCsv()}>
            <Download size={17} /> Exportar CSV
          </button>
        </div>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="route-groups">
            <div className="route-search">
              <SearchBar value={employeeSearch} onChange={setEmployeeSearch} placeholder="Buscar funcionario para alocar" />
            </div>
            <section className="employee-pool" aria-label="Funcionarios disponiveis">
              <h3>Funcionarios disponiveis</h3>
              <div className="employee-pool-list">
                {availableEmployees.slice(0, 80).map((employee: any) => (
                  <EmployeeDragItem key={employee.id} id={`available:${employee.id}`} employee={employee} className="employee-chip">
                    {({ attributes, listeners }) => (
                      <>
                        <button type="button" className="drag-handle" title="Arrastar funcionario" aria-label={`Arrastar ${employee.name}`} {...attributes} {...listeners}>
                          <GripVertical size={15} />
                        </button>
                        <span>{employee.name}<small>{employee.client?.name} - {employee.address ?? "sem endereco"}</small></span>
                      </>
                    )}
                  </EmployeeDragItem>
                ))}
                {availableEmployees.length === 0 && <p className="muted-copy">Nenhum funcionario disponivel para os filtros atuais.</p>}
              </div>
            </section>
            {cards.map((card) => {
              const vehicle = vehicles.find((item: any) => item.id === card.vehicleId);
              const over = card.employeeIds.length > Number(vehicle?.capacity ?? 0);
              return (
                <RouteDropCard
                  key={card.instanceId}
                  card={card}
                  vehicle={vehicle}
                  drivers={drivers}
                  employees={employees}
                  over={over}
                  updateCard={updateCard}
                  removeCard={(instanceId) => setCards(cards.filter((item) => item.instanceId !== instanceId))}
                  duplicateCard={duplicateCard}
                  moveEmployee={moveEmployee}
                  removeEmployee={removeEmployee}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeEmployee && <div className="employee-chip dragging-preview"><span>{activeEmployee.name}<small>{activeEmployee.client?.name}</small></span></div>}
          </DragOverlay>
        </DndContext>
      </section>
      <section className="data-section route-history">
        <h3>Rotas salvas</h3>
        <SearchBar value={historySearch} onChange={setHistorySearch} placeholder="Filtrar rotas salvas" />
        <DataTable
          columns={["Nome", "Cliente", "Data", "Status", "Veiculo", "Atualizado", "Acoes"]}
          rows={searchedRoutes.map((route: any) => [
            route.name,
            route.client?.name ?? "-",
            new Date(route.date).toLocaleDateString("pt-BR"),
            route.status,
            route.vehicles?.map((item: any) => item.vehicle?.label).filter(Boolean).join(", ") || "-",
            new Date(route.updatedAt ?? route.createdAt).toLocaleString("pt-BR"),
            <div className="row-actions" key={route.id}>
              {can(user, "routes", "edit") && <button className="icon-button" title="Editar rota" onClick={() => loadRoute(route)}><Edit3 size={16} /></button>}
              <button className="icon-button" title="Exportar rota" onClick={() => exportSavedRoute(route)}><Download size={16} /></button>
            </div>
          ])}
        />
      </section>
    </>
  );
}

function UsersModule({ users, refresh, user, notify }: any) {
  const [form, setForm] = useState(emptyUser);
  const [search, setSearch] = useState("");
  const editing = Boolean(form.id);
  const rows = users.filter((savedUser: any) => matchesSearch(savedUser, search));
  return (
    <>
      <PageHeader eyebrow="Seguranca" title="Usuarios e permissoes" help="Crie usuarios e defina permissoes por modulo. Logout fica em Configuracoes." />
      {can(user, "users", editing ? "edit" : "create") && <EditorPanel title={editing ? "Editar usuario" : "Novo usuario"} onCancel={editing ? () => setForm(emptyUser) : undefined} onSubmit={async () => {
        await api.saveUser(form as any);
        setForm(emptyUser);
        refresh();
        notify(editing ? "Usuario atualizado." : "Usuario cadastrado.");
      }}>
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Input label={editing ? "Nova senha" : "Senha inicial"} type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required={!editing} />
        <button type="button" className="secondary-button" onClick={() => setForm({ ...form, permissions: createFullPermissionMatrix() })}>Permissao total</button>
      </EditorPanel>}
      <SearchBar value={search} onChange={setSearch} placeholder="Filtrar usuarios" />
      <DataSection
        columns={["Nome", "Email", "Status", "Permissoes", "Acoes"]}
        rows={rows.map((savedUser: any) => [
          savedUser.name,
          savedUser.email,
          savedUser.status,
          savedUser.permissions?.filter((p: any) => p.allowed).length ?? 0,
          <RowActions key={savedUser.id} canEdit={can(user, "users", "edit")} canDelete={can(user, "users", "delete")} onEdit={() => setForm({ ...emptyUser, ...savedUser, password: "", permissions: createFullPermissionMatrix() })} onDelete={async () => { await api.deleteUser(savedUser.id); refresh(); notify("Usuario excluido."); }} />
        ])}
      />
    </>
  );
}

function SettingsModule({ user, showUpdate, onLogout, refresh, notify }: any) {
  const [updateMessage, setUpdateMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupSettings, setBackupSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!can(user, "settings", "view")) return;
    api.getBackupSettings().then(setBackupSettings);
    api.listAuditLogs().then(setAuditLogs);
  }, [user]);

  async function checkUpdates() {
    setChecking(true);
    const result = await api.checkForUpdates();
    setChecking(false);
    if (result.status === "available") {
      showUpdate(result);
      setUpdateMessage(`Versao ${result.latestVersion} disponivel.`);
      return;
    }
    if (result.status === "disabled") {
      setUpdateMessage(result.message ?? "Atualizacoes ativas apenas no app instalado.");
      return;
    }
    if (result.status === "error") {
      setUpdateMessage(result.message ?? "Nao foi possivel verificar atualizacoes.");
      return;
    }
    setUpdateMessage("Voce ja esta usando a versao mais recente.");
  }

  async function restoreBackup() {
    if (!window.confirm("Restaurar um backup vai substituir o banco local atual. Uma copia de seguranca sera criada antes da troca. Deseja continuar?")) {
      return;
    }
    setRestoring(true);
    try {
      const result = await api.restoreBackup();
      if (result.restored) {
        refresh();
        setBackupSettings(await api.getBackupSettings());
        setAuditLogs(await api.listAuditLogs());
        notify("Backup restaurado com sucesso.");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nao foi possivel restaurar o backup.", "error");
    } finally {
      setRestoring(false);
    }
  }

  async function chooseBackupDirectory() {
    const result = await api.chooseBackupDirectory();
    if (result.directory) {
      setBackupSettings(await api.getBackupSettings());
      notify("Pasta de backup atualizada.");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Preferencias" title="Configuracoes" help="Aqui ficam acoes de conta, atualizacao manual e manutencao local do app." />
      <section className="settings-grid">
        <div className="panel">
          <h3>Conta</h3>
          <p className="muted-copy">Usuario atual: <strong>{user.name}</strong></p>
          <button className="secondary-button danger" onClick={() => onLogout()}><LogOut size={17} /> Sair da conta</button>
        </div>
        <div className="panel">
          <h3>Atualizacoes</h3>
          <p className="muted-copy">Use este botao quando a notificacao de abertura tiver sido deixada para depois.</p>
          <button className="primary-button" onClick={checkUpdates} disabled={checking}>
            <Download size={17} /> {checking ? "Verificando..." : "Verificar atualizacao"}
          </button>
          {updateMessage && <p className="success-line">{updateMessage}</p>}
        </div>
        <div className="panel">
          <h3>Ajuda no app</h3>
          <p className="muted-copy">Os icones de interrogacao ao lado dos titulos explicam o uso de cada tela e reduzem a necessidade de treinamento externo.</p>
        </div>
        <div className="panel">
          <h3>Backup e restauracao</h3>
          <p className="muted-copy">Pasta atual: <strong>{backupSettings?.directory ?? "Carregando..."}</strong></p>
          {backupSettings?.latestBackup ? (
            <p className={backupSettings.latestBackup.ageDays > 7 ? "error-line" : "success-line"}>
              Ultimo backup ha {backupSettings.latestBackup.ageDays} dia(s).
            </p>
          ) : <p className="error-line">Nenhum backup encontrado.</p>}
          <button className="secondary-button" onClick={chooseBackupDirectory} disabled={!can(user, "settings", "edit")}>
            <DatabaseBackup size={17} /> Escolher pasta
          </button>
          <p className="muted-copy">Restaure um arquivo `.db` gerado pelo ViaNexo. O app valida o arquivo e cria uma copia do banco atual antes de substituir os dados.</p>
          <button className="secondary-button danger" onClick={restoreBackup} disabled={restoring || !can(user, "settings", "edit")}>
            <DatabaseBackup size={17} /> {restoring ? "Restaurando..." : "Restaurar backup"}
          </button>
        </div>
        <div className="panel audit-panel">
          <h3>Auditoria recente</h3>
          {auditLogs.length === 0 ? <p className="muted-copy">Nenhuma acao sensivel registrada.</p> : (
            <ul>
              {auditLogs.slice(0, 8).map((log) => (
                <li key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.user?.name ?? "Sistema"} - {new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function UpdatePrompt({ update, installing, onInstall, onLater }: {
  update: UpdateCheckResult;
  installing: boolean;
  onInstall: () => void;
  onLater: () => void;
}) {
  return (
    <div className="update-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title">
      <section className="update-dialog">
        <div className="update-icon"><Bell size={22} /></div>
        <div>
          <span className="dialog-eyebrow">Atualizacao disponivel</span>
          <h2 id="update-title">Nova versao do {appName}</h2>
          {update.status === "error" ? (
            <p>{update.message ?? "Nao foi possivel baixar a atualizacao agora."}</p>
          ) : (
            <p>A versao {update.latestVersion} esta disponivel. Voce esta usando a versao {update.currentVersion}.</p>
          )}
          <div className="update-actions">
            <button className="primary-button" onClick={onInstall} disabled={installing || update.status === "error"}>
              <Download size={17} /> {installing ? "Baixando..." : "Atualizar agora"}
            </button>
            <button className="secondary-button" onClick={onLater}>Depois</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EditorPanel({ title, children, onSubmit, onCancel }: { title: string; children: React.ReactNode; onSubmit: () => Promise<void>; onCancel?: () => void }) {
  return (
    <form className="editor-panel" onSubmit={async (event) => { event.preventDefault(); await onSubmit(); }}>
      <div className="editor-heading">
        <h3>{title}</h3>
        {onCancel && <button type="button" className="link-button" onClick={onCancel}>Cancelar edicao</button>}
      </div>
      <div className="editor-grid">{children}</div>
      <button className="primary-button" type="submit"><Plus size={17} /> Salvar</button>
    </form>
  );
}

function Input({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="search-bar">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <Filter size={16} />
    </div>
  );
}

function RowActions({ onEdit, onDelete, canEdit = true, canDelete = true }: { onEdit: () => void; onDelete: () => void; canEdit?: boolean; canDelete?: boolean }) {
  return (
    <div className="row-actions">
      {canEdit && <button className="icon-button" title="Editar" onClick={onEdit}><Edit3 size={16} /></button>}
      {canDelete && <button className="icon-button" title="Excluir" onClick={() => {
        if (window.confirm("Tem certeza que deseja excluir este registro?")) {
          onDelete();
        }
      }}><Trash2 size={16} /></button>}
    </div>
  );
}

function DataSection({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="data-section">
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={Math.max(columns.length, 1)}>Nenhum registro encontrado.</td></tr>
          ) : rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api.bootstrap().then((state) => setNeedsSetup(state.needsSetup));
  }, []);

  if (needsSetup === null) {
    return <div className="boot-screen">Carregando {appName}...</div>;
  }

  if (needsSetup) {
    return <SetupScreen onDone={() => setNeedsSetup(false)} />;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <Shell user={user} onLogout={async () => {
    await api.logout();
    setUser(null);
  }} />;
}

createRoot(document.getElementById("root")!).render(<App />);
