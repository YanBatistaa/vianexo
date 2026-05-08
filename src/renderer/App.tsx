import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  Bell,
  Bus,
  Check,
  DatabaseBackup,
  Download,
  Edit3,
  FileSpreadsheet,
  HelpCircle,
  LogOut,
  MapPinned,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  Wrench,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import { createFullPermissionMatrix, createViewOnlyPermissionMatrix } from "../shared/permissions";
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
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, deps);

  return { data, setData, loading };
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

function Shell({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updateState, setUpdateState] = useState<UpdateCheckResult | null>(null);
  const [updateHidden, setUpdateHidden] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  const clients = useAsyncData(() => api.listClients(), [refreshKey], []);
  const employees = useAsyncData(() => api.listEmployees(), [refreshKey], []);
  const vehicles = useAsyncData(() => api.listVehicles(), [refreshKey], []);
  const drivers = useAsyncData(() => api.listDrivers(), [refreshKey], []);
  const users = useAsyncData(() => api.listUsers(), [refreshKey], []);
  const routes = useAsyncData(() => api.listRoutes(), [refreshKey], []);

  const context = {
    user,
    clients: clients.data,
    employees: employees.data,
    vehicles: vehicles.data,
    drivers: drivers.data,
    users: users.data,
    routes: routes.data,
    refresh: () => setRefreshKey((value) => value + 1),
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
          {navItems.map((item) => {
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
        action={<BackupButton />}
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

function BackupButton() {
  const [message, setMessage] = useState("");
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

function ClientsModule({ clients, refresh }: any) {
  const [form, setForm] = useState(emptyClient);
  const editing = Boolean(form.id);
  return (
    <>
      <PageHeader eyebrow="Cadastro" title="Clientes contratantes" help="Cadastre empresas contratantes. A edicao reutiliza o mesmo formulario apos clicar no icone de lapis." />
      <EditorPanel title={editing ? "Editar cliente" : "Novo cliente"} onCancel={editing ? () => setForm(emptyClient) : undefined} onSubmit={async () => {
        await api.saveClient(form);
        setForm(emptyClient);
        refresh();
      }}>
        <Input label="Empresa" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Documento" value={form.document} onChange={(document) => setForm({ ...form, document })} required={false} />
        <Input label="Contato" value={form.contact} onChange={(contact) => setForm({ ...form, contact })} required={false} />
        <Input label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required={false} />
      </EditorPanel>
      <DataSection
        columns={["Empresa", "Contato", "Telefone", "Funcionarios", "Rotas", "Acoes"]}
        rows={clients.map((client: any) => [
          client.name,
          client.contact ?? "-",
          client.phone ?? "-",
          client._count?.employees ?? 0,
          client._count?.routes ?? 0,
          <RowActions key={client.id} onEdit={() => setForm({ ...emptyClient, ...client })} onDelete={async () => { await api.deleteClient(client.id); refresh(); }} />
        ])}
      />
    </>
  );
}

function DriversModule({ drivers, refresh }: any) {
  const [form, setForm] = useState(emptyDriver);
  const editing = Boolean(form.id);
  return (
    <>
      <PageHeader eyebrow="Frota" title="Motoristas" help="Motoristas podem ser cadastrados aqui ou diretamente na tela de Frota ao digitar um nome novo." />
      <EditorPanel title={editing ? "Editar motorista" : "Novo motorista"} onCancel={editing ? () => setForm(emptyDriver) : undefined} onSubmit={async () => {
        await api.saveDriver(form);
        setForm(emptyDriver);
        refresh();
      }}>
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required={false} />
        <Input label="Documento" value={form.document} onChange={(document) => setForm({ ...form, document })} required={false} />
      </EditorPanel>
      <DataSection
        columns={["Nome", "Telefone", "Documento", "Veiculos", "Acoes"]}
        rows={drivers.map((driver: any) => [
          driver.name,
          driver.phone ?? "-",
          driver.document ?? "-",
          driver.vehicles?.map((item: any) => item.vehicle.label).join(", ") || "-",
          <RowActions key={driver.id} onEdit={() => setForm({ ...emptyDriver, ...driver })} onDelete={async () => { await api.deleteDriver(driver.id); refresh(); }} />
        ])}
      />
    </>
  );
}

function VehiclesModule({ vehicles, drivers, refresh }: any) {
  const [form, setForm] = useState(emptyVehicle);
  const editing = Boolean(form.id);
  return (
    <>
      <PageHeader eyebrow="Frota" title="Veiculos e capacidades" help="Digite um motorista novo ou escolha um existente na lista suspensa. Se o nome nao existir, ele sera criado automaticamente." />
      <EditorPanel title={editing ? "Editar veiculo" : "Novo veiculo"} onCancel={editing ? () => setForm(emptyVehicle) : undefined} onSubmit={async () => {
        await api.saveVehicle(form as any);
        setForm(emptyVehicle);
        refresh();
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
      </EditorPanel>
      <DataSection
        columns={["Veiculo", "Placa", "Capacidade", "Status", "Motoristas", "Acoes"]}
        rows={vehicles.map((vehicle: any) => [
          vehicle.label,
          vehicle.plate ?? "-",
          vehicle.capacity,
          vehicle.status,
          vehicle.drivers?.map((item: any) => item.driver.name).join(", ") || "-",
          <RowActions key={vehicle.id} onEdit={() => setForm({
            ...emptyVehicle,
            ...vehicle,
            driverName: vehicle.drivers?.[0]?.driver?.name ?? ""
          })} onDelete={async () => { await api.deleteVehicle(vehicle.id); refresh(); }} />
        ])}
      />
    </>
  );
}

function EmployeesModule({ employees, clients }: any) {
  const [clientId, setClientId] = useState("");
  const filtered = clientId ? employees.filter((employee: any) => employee.clientId === clientId) : employees;
  return (
    <>
      <PageHeader eyebrow="Base importada" title="Funcionarios por cliente" help="Use o filtro para consultar uma empresa especifica ou mantenha Todos para ver toda a base importada." />
      <div className="toolbar">
        <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map((client: any) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>
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

function ImportsModule({ clients, refresh }: any) {
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("modelo-manual.xlsx");
  const [map, setMap] = useState<Record<string, string>>({});
  const columns = Object.keys(rows[0] ?? {});

  async function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    setRows(json.slice(0, 200));
  }

  function seedRows() {
    setRows([
      { Nome: "Ana Silva", Bairro: "Centro", Destino: "Galpao A", Telefone: "11999990000", Turno: "Manha" },
      { Nome: "Bruno Costa", Bairro: "Jardim Norte", Destino: "Galpao A", Telefone: "11988880000", Turno: "Noite" },
      { Nome: "Carla Ramos", Bairro: "Vila Nova", Destino: "Sede", Telefone: "11977770000", Turno: "Manha" }
    ]);
  }

  async function importNow() {
    const payloadRows: EmployeeImportRow[] = rows.map((row) => {
      const used = new Set(Object.values(map));
      const extraData = Object.fromEntries(Object.entries(row).filter(([key]) => !used.has(key)));
      return {
        name: String(row[map.name] ?? ""),
        address: map.address ? String(row[map.address] ?? "") : undefined,
        destination: map.destination ? String(row[map.destination] ?? "") : undefined,
        phone: map.phone ? String(row[map.phone] ?? "") : undefined,
        notes: map.notes ? String(row[map.notes] ?? "") : undefined,
        extraData
      };
    }).filter((row) => row.name);

    await api.importEmployees({ clientId, fileName, columnMap: map, rows: payloadRows, rawPreview: rows.slice(0, 5) });
    setRows([]);
    setMap({});
    refresh();
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
          <button className="primary-button" disabled={!clientId || !map.name || rows.length === 0} onClick={importNow}>
            <Save size={17} /> Importar {rows.length || ""} linhas
          </button>
        </div>
      </section>
      <DataSection columns={columns} rows={rows.slice(0, 8).map((row) => columns.map((column) => String(row[column] ?? "")))} />
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

function RoutesModule({ clients, employees, vehicles, drivers, routes, refresh }: any) {
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cards, setCards] = useState<RouteCard[]>([]);
  const filteredEmployees = clientId ? employees.filter((employee: any) => employee.clientId === clientId) : employees;
  const selectedEmployeeIds = useMemo(() => new Set(cards.flatMap((card) => card.employeeIds)), [cards]);
  const availableEmployees = filteredEmployees.filter((employee: any) => !selectedEmployeeIds.has(employee.id));

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

  function loadRoute(route: any) {
    const routeVehicle = route.vehicles?.[0];
    if (!routeVehicle) return;
    setDate(new Date(route.date).toISOString().slice(0, 10));
    setClientId(route.client?.name === "Rotas multiclientes" ? "" : route.clientId);
    setCards([{
      instanceId: `${route.id}-${Date.now()}`,
      routeId: route.id,
      vehicleId: routeVehicle.vehicleId,
      name: route.name,
      driverId: routeVehicle.driverId ?? "",
      employeeIds: routeVehicle.passengers?.map((item: any) => item.employeeId) ?? [],
      status: route.status
    }]);
  }

  async function saveBatch(status: "DRAFT" | "FINAL") {
    await api.saveRouteBatch({
      clientId: clientId || undefined,
      date,
      routes: cards.map((card) => ({ ...card, status }))
    });
    setCards([]);
    refresh();
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
          <button className="primary-button" disabled={cards.length === 0} onClick={() => saveBatch("FINAL")}>
            <Save size={17} /> Salvar todos
          </button>
          <button className="secondary-button" disabled={cards.length === 0} onClick={() => saveBatch("DRAFT")}>
            <Archive size={17} /> Salvar rascunho
          </button>
        </div>
        <div className="route-groups">
          {cards.map((card) => {
            const vehicle = vehicles.find((item: any) => item.id === card.vehicleId);
            const over = card.employeeIds.length > Number(vehicle?.capacity ?? 0);
            return (
              <article key={card.instanceId} className={`route-card ${over ? "over" : ""}`}>
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
                <select value="" onChange={(event) => event.target.value && updateCard(card.instanceId, (current) => ({ ...current, employeeIds: [...current.employeeIds, event.target.value] }))}>
                  <option value="">Adicionar funcionario</option>
                  {availableEmployees.map((employee: any) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.client?.name} - {employee.address ?? "sem endereco"}</option>)}
                </select>
                <ul>
                  {card.employeeIds.map((id) => {
                    const employee = employees.find((item: any) => item.id === id);
                    return (
                      <li key={id}>
                        <span>{employee?.name}<small>{employee?.client?.name}</small></span>
                        <button onClick={() => updateCard(card.instanceId, (current) => ({ ...current, employeeIds: current.employeeIds.filter((item) => item !== id) }))}>remover</button>
                      </li>
                    );
                  })}
                </ul>
                <button className="secondary-button" onClick={() => setCards(cards.filter((item) => item.instanceId !== card.instanceId))}>
                  <X size={17} /> Remover card
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="data-section route-history">
        <h3>Rotas salvas</h3>
        <DataTable
          columns={["Nome", "Cliente", "Data", "Status", "Veiculo", "Acoes"]}
          rows={routes.map((route: any) => [
            route.name,
            route.client?.name ?? "-",
            new Date(route.date).toLocaleDateString("pt-BR"),
            route.status,
            route.vehicles?.[0]?.vehicle?.label ?? "-",
            <button key={route.id} className="icon-button" title="Editar rota" onClick={() => loadRoute(route)}><Edit3 size={16} /></button>
          ])}
        />
      </section>
    </>
  );
}

function UsersModule({ users, refresh }: any) {
  const [form, setForm] = useState(emptyUser);
  const editing = Boolean(form.id);
  return (
    <>
      <PageHeader eyebrow="Seguranca" title="Usuarios e permissoes" help="Crie usuarios e defina permissoes por modulo. Logout fica em Configuracoes." />
      <EditorPanel title={editing ? "Editar usuario" : "Novo usuario"} onCancel={editing ? () => setForm(emptyUser) : undefined} onSubmit={async () => {
        await api.saveUser(form as any);
        setForm(emptyUser);
        refresh();
      }}>
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Input label={editing ? "Nova senha" : "Senha inicial"} type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required={!editing} />
        <button type="button" className="secondary-button" onClick={() => setForm({ ...form, permissions: createFullPermissionMatrix() })}>Permissao total</button>
      </EditorPanel>
      <DataSection
        columns={["Nome", "Email", "Status", "Permissoes", "Acoes"]}
        rows={users.map((user: any) => [
          user.name,
          user.email,
          user.status,
          user.permissions?.filter((p: any) => p.allowed).length ?? 0,
          <RowActions key={user.id} onEdit={() => setForm({ ...emptyUser, ...user, password: "", permissions: createFullPermissionMatrix() })} onDelete={async () => { await api.deleteUser(user.id); refresh(); }} />
        ])}
      />
    </>
  );
}

function SettingsModule({ user, showUpdate, onLogout }: any) {
  const [updateMessage, setUpdateMessage] = useState("");
  const [checking, setChecking] = useState(false);

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

  return (
    <>
      <PageHeader eyebrow="Preferencias" title="Configuracoes" help="Aqui ficam acoes de conta, atualizacao manual e manutencao local do app." />
      <section className="settings-grid">
        <div className="panel">
          <h3>Conta</h3>
          <p className="muted-copy">Usuario atual: <strong>{user.name}</strong></p>
          <button className="secondary-button danger" onClick={onLogout}><LogOut size={17} /> Sair da conta</button>
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

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="row-actions">
      <button className="icon-button" title="Editar" onClick={onEdit}><Edit3 size={16} /></button>
      <button className="icon-button" title="Excluir" onClick={onDelete}><Trash2 size={16} /></button>
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

  return <Shell user={user} onLogout={() => setUser(null)} />;
}

createRoot(document.getElementById("root")!).render(<App />);
