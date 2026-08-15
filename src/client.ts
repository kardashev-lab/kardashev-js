const DEFAULT_BASE_URL = "https://data.kardashevlabs.org";

export interface ClientOptions {
  /** Override the API base URL (useful for local dev). */
  baseUrl?: string;
  /** Fetch timeout in milliseconds. Default 30000. */
  timeoutMs?: number;
}

export type DateInput = string | Date;

export type Row = Record<string, unknown>;

function fmtDate(d?: DateInput): string | undefined {
  if (d == null) return undefined;
  if (typeof d === "string") return d;
  return d.toISOString().slice(0, 10);
}

export class Client {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  private async fetchJson<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) search.set(key, String(value));
    }
    const qs = search.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`kardashev: GET ${path} failed with ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private get<T = Row>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T[]> {
    return this.fetchJson<T[]>(path, params);
  }

  /** For endpoints that return a single JSON object rather than an array of rows. */
  private getObject<T = Row>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    return this.fetchJson<T>(path, params);
  }

  // ------------------------------------------------------------------
  // Fuel mix
  // ------------------------------------------------------------------

  /** Real-time fuel mix (MW by fuel type) for an ISO. */
  fuelMix(
    iso: string,
    opts: { start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/fuel-mix", {
      iso: iso.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // Carbon intensity
  // ------------------------------------------------------------------

  /** Hourly carbon intensity (lbs CO2/MWh) for an ISO. */
  carbon(
    iso: string,
    opts: { start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/carbon", {
      iso: iso.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Latest carbon snapshot. One row per ISO. */
  carbonLatest(iso?: string): Promise<Row[]> {
    return this.get("/carbon/latest", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // LMP
  // ------------------------------------------------------------------

  /** Locational marginal prices (LMP, energy, congestion, loss). */
  lmp(
    iso: string,
    opts: {
      nodeId?: string;
      market?: string;
      start?: DateInput;
      end?: DateInput;
      hours?: number;
      limit?: number;
    } = {}
  ): Promise<Row[]> {
    return this.get("/lmp", {
      iso: iso.toUpperCase(),
      node_id: opts.nodeId,
      market: (opts.market ?? "RT").toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Latest LMP for all nodes with lat/lng, for map rendering. */
  lmpMap(iso: string, market = "RT"): Promise<Row[]> {
    return this.get("/lmp/map", { iso: iso.toUpperCase(), market: market.toUpperCase() });
  }

  /** List all tracked LMP pricing nodes. */
  lmpHubs(iso?: string): Promise<Row[]> {
    return this.get("/lmp/hubs", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // Load
  // ------------------------------------------------------------------

  /** Actual electricity Demand (MW) by ISO. Demand is consumption, not Large Load. */
  load(
    opts: { iso?: string; start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/load", {
      iso: opts.iso?.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** ISO Demand forecast (MW) for the next N hours. Not a Kardashev Spread Issuance. */
  loadForecast(opts: { iso?: string; hours?: number } = {}): Promise<Row[]> {
    return this.get("/load/forecast", { iso: opts.iso?.toUpperCase(), hours: opts.hours ?? 24 });
  }

  // ------------------------------------------------------------------
  // Generation
  // ------------------------------------------------------------------

  /** Wind/solar generation forecast for an ISO. */
  generationWindSolar(
    iso: string,
    opts: { fuelType?: string; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/generation/wind-solar", {
      iso: iso.toUpperCase(),
      fuel_type: opts.fuelType,
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Battery storage state of charge/output. Currently CAISO only. */
  generationBattery(opts: { iso?: string; hours?: number; limit?: number } = {}): Promise<Row[]> {
    return this.get("/generation/battery", {
      iso: opts.iso?.toUpperCase() ?? "CAISO",
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Behind-the-meter solar estimate. Currently NYISO only. */
  generationBtmSolar(opts: { iso?: string; hours?: number; limit?: number } = {}): Promise<Row[]> {
    return this.get("/generation/btm-solar", {
      iso: opts.iso?.toUpperCase() ?? "NYISO",
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Planning reserve margins by ISO. */
  generationReserveMargins(iso?: string): Promise<Row[]> {
    return this.get("/generation/reserve-margins", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // Curtailment
  // ------------------------------------------------------------------

  /** Published Curtailment (MWh) at ISO/fuel grain. Not Resource Curtailment. */
  curtailment(
    opts: { iso?: string; start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/curtailment", {
      iso: opts.iso?.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // Interchange
  // ------------------------------------------------------------------

  /** Net interchange (MW) from a balancing authority to neighbors. */
  interchange(
    ba: string,
    opts: { start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/interchange", {
      ba: ba.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 5000,
    });
  }

  // ------------------------------------------------------------------
  // Natural gas
  // ------------------------------------------------------------------

  /** Daily natural gas spot prices ($/MMBtu) at major US hubs. */
  natGas(
    opts: { hub?: string; start?: DateInput; end?: DateInput; days?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/natural-gas", {
      hub: opts.hub,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 90,
      limit: opts.limit ?? 5000,
    });
  }

  /** Weekly EIA natural gas in storage (Bcf) by region. */
  natGasStorage(
    opts: {
      region?: string;
      start?: DateInput;
      end?: DateInput;
      weeks?: number;
      limit?: number;
    } = {}
  ): Promise<Row[]> {
    return this.get("/natural-gas/storage", {
      region: opts.region,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      weeks: opts.weeks ?? 52,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // Weather
  // ------------------------------------------------------------------

  /** Hourly temperature at representative ISO hub cities. */
  weather(
    opts: { iso?: string; start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/weather", {
      iso: opts.iso?.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // BPA
  // ------------------------------------------------------------------

  /** BPA 5-min balancing area: wind, hydro, thermal, load. */
  bpa(opts: { start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}): Promise<Row[]> {
    return this.get("/bpa", {
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // Generator outages
  // ------------------------------------------------------------------

  /** Generator outages (unit-level and aggregate) by ISO. */
  outages(
    opts: {
      iso?: string;
      outageType?: string;
      activeOnly?: boolean;
      days?: number;
      limit?: number;
    } = {}
  ): Promise<Row[]> {
    return this.get("/outages", {
      iso: opts.iso?.toUpperCase(),
      outage_type: opts.outageType,
      active_only: opts.activeOnly ? true : undefined,
      days: opts.days ?? 7,
      limit: opts.limit ?? 2000,
    });
  }

  /** Total MW in outage grouped by ISO x outage type. */
  outagesSummary(iso?: string): Promise<Row[]> {
    return this.get("/outages/summary", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // Ancillary services
  // ------------------------------------------------------------------

  /** Ancillary service clearing prices and operational capacity. */
  ancillary(
    opts: {
      iso?: string;
      market?: string;
      serviceType?: string;
      start?: DateInput;
      end?: DateInput;
      hours?: number;
      limit?: number;
    } = {}
  ): Promise<Row[]> {
    return this.get("/ancillary", {
      iso: opts.iso?.toUpperCase(),
      market: opts.market?.toUpperCase(),
      service_type: opts.serviceType,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  /** Latest ancillary snapshot. One row per (ISO, market, service_type). */
  ancillaryLatest(iso?: string): Promise<Row[]> {
    return this.get("/ancillary/latest", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // Nuclear
  // ------------------------------------------------------------------

  /** Current nuclear unit capacity and output. */
  nuclearStatus(iso?: string): Promise<Row[]> {
    return this.get("/nuclear", { iso: iso?.toUpperCase() });
  }

  /** Nuclear capacity/output summary. Returns a single object, not rows. */
  nuclearSummary(iso?: string): Promise<Row> {
    return this.getObject("/nuclear/summary", { iso: iso?.toUpperCase() });
  }

  // ------------------------------------------------------------------
  // Emissions
  // ------------------------------------------------------------------

  /** SO2, NOx, CO2 emissions by ISO. */
  emissions(
    opts: { iso?: string; start?: DateInput; end?: DateInput; hours?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/emissions", {
      iso: opts.iso?.toUpperCase(),
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      hours: opts.hours ?? 24,
      limit: opts.limit ?? 2000,
    });
  }

  // ------------------------------------------------------------------
  // Hydro
  // ------------------------------------------------------------------

  /** Reservoir storage levels. */
  hydroReservoirs(
    opts: { reservoir?: string; start?: DateInput; end?: DateInput; days?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/hydro/reservoirs", {
      reservoir: opts.reservoir,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 90,
      limit: opts.limit ?? 5000,
    });
  }

  /** Latest reservoir storage snapshot. */
  hydroReservoirsLatest(): Promise<Row[]> {
    return this.get("/hydro/reservoirs/latest");
  }

  /** USGS streamflow by site. */
  hydroStreamflow(
    opts: { siteId?: string; start?: DateInput; end?: DateInput; days?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/hydro/streamflow", {
      site_id: opts.siteId,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 7,
      limit: opts.limit ?? 5000,
    });
  }

  // ------------------------------------------------------------------
  // Solar
  // ------------------------------------------------------------------

  /** Solar irradiance by location. */
  solarIrradiance(
    opts: { location?: string; start?: DateInput; end?: DateInput; days?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/solar/irradiance", {
      location: opts.location,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 7,
      limit: opts.limit ?? 10_000,
    });
  }

  /** Tracked irradiance station locations. */
  solarIrradianceLocations(): Promise<Row[]> {
    return this.get("/solar/irradiance/locations");
  }

  /** Latest irradiance snapshot per location. */
  solarIrradianceLatest(): Promise<Row[]> {
    return this.get("/solar/irradiance/latest");
  }

  // ------------------------------------------------------------------
  // Interconnection queue
  // ------------------------------------------------------------------

  /** Interconnection Project Current Observation. Request ID is ISO-native (INR at ERCOT). */
  queue(
    opts: { iso?: string; status?: string; fuelType?: string; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/interconnection-queue", {
      iso: opts.iso?.toUpperCase(),
      status: opts.status,
      fuel_type: opts.fuelType,
      limit: opts.limit ?? 5000,
    });
  }

  // ------------------------------------------------------------------
  // Commodities
  // ------------------------------------------------------------------

  /** EIA monthly coal prices by rank ($/short ton). */
  commoditiesCoal(opts: { rank?: string; months?: number } = {}): Promise<Row[]> {
    return this.get("/commodities/coal", { rank: opts.rank, months: opts.months ?? 24 });
  }

  /** EIA daily petroleum spot prices (WTI, Brent, RBOB, heating oil). */
  commoditiesPetroleum(
    opts: { product?: string; start?: DateInput; end?: DateInput; days?: number; limit?: number } = {}
  ): Promise<Row[]> {
    return this.get("/commodities/petroleum", {
      product: opts.product,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 90,
      limit: opts.limit ?? 5000,
    });
  }

  /** EIA monthly natural gas used for power generation ("power burn"). */
  commoditiesPowerBurn(opts: { state?: string; months?: number } = {}): Promise<Row[]> {
    return this.get("/commodities/power-burn", { state: opts.state, months: opts.months ?? 12 });
  }

  /** EIA Short-Term Energy Outlook: monthly 2-year energy forecasts. */
  steoForecast(): Promise<Row[]> {
    return this.get("/forecasts/steo");
  }

  // ------------------------------------------------------------------
  // Carbon markets
  // ------------------------------------------------------------------

  /** Carbon credit prices (RGGI, WCI, VCM). */
  carbonMarkets(
    opts: {
      market?: string;
      start?: DateInput;
      end?: DateInput;
      days?: number;
      limit?: number;
    } = {}
  ): Promise<Row[]> {
    return this.get("/carbon-markets", {
      market: opts.market,
      start: fmtDate(opts.start),
      end: fmtDate(opts.end),
      days: opts.days ?? 90,
      limit: opts.limit ?? 2000,
    });
  }
}
