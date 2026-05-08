export function matchesSearch(value: unknown, search: string) {
  return JSON.stringify(value ?? "").toLowerCase().includes(search.trim().toLowerCase());
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

export function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName.replace(/[^\w.-]+/g, "-").toLowerCase()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

type SearchableRoute = {
  name?: string;
  status?: string;
  date?: string;
  client?: { name?: string | null } | null;
  vehicles?: Array<{
    vehicle?: { label?: string | null; plate?: string | null } | null;
    driver?: { name?: string | null } | null;
    passengers?: Array<{
      employee?: {
        name?: string | null;
        client?: { name?: string | null } | null;
        address?: string | null;
        destination?: string | null;
      } | null;
    }>;
  }>;
};

export function routeSearchPayload(route: SearchableRoute) {
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
