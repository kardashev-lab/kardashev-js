# kardashev

Free, open-source JavaScript/TypeScript client for US grid data: LMP, load, fuel mix, carbon intensity, curtailment, and interconnection queues across CAISO, ERCOT, MISO, NYISO, ISONE, SPP, and PJM. No API key required.

## Install

```bash
npm install @kardashev-labs/kardashev
```

## Usage

```ts
import { Client } from "@kardashev-labs/kardashev";

const kl = new Client();

const fuel = await kl.fuelMix("CAISO");
const carbon = await kl.carbonLatest();
const prices = await kl.lmp("PJM", { market: "RT", limit: 50 });
const queue = await kl.queue({ iso: "ERCOT" });
```

Works in Node.js 18+ (uses the built-in `fetch`) and in the browser/edge runtimes.

## Common tasks

Fuel mix for all 7 ISOs in one pass:

```ts
const isos = ["CAISO", "ERCOT", "MISO", "NYISO", "ISONE", "SPP", "PJM"];
const mixes = Object.fromEntries(
  await Promise.all(isos.map(async (iso) => [iso, await kl.fuelMix(iso)]))
);
```

Custom base URL (local dev):

```ts
const kl = new Client({ baseUrl: "http://localhost:8000" });
```

## API reference

| Method | Description |
|---|---|
| `fuelMix(iso, opts)` | Generation by fuel type |
| `carbon(iso, opts)` | Carbon intensity (lbs CO2/MWh) |
| `carbonLatest(iso?)` | Latest carbon intensity for all ISOs |
| `lmp(iso, opts)` | LMP price history |
| `lmpMap(iso, market?)` | All nodes with latest price + coordinates |
| `lmpHubs(iso?)` | Hub/zone node list |
| `load(opts)` | Actual grid load |
| `loadForecast(opts)` | Load forecast |
| `generationWindSolar(iso, opts)` | Wind/solar generation forecast |
| `generationBattery(opts)` | Battery storage (CAISO) |
| `generationBtmSolar(opts)` | Behind-the-meter solar (NYISO) |
| `generationReserveMargins(iso?)` | Planning reserve margins |
| `curtailment(opts)` | Renewable curtailment |
| `interchange(ba, opts)` | Tie-line power flows |
| `natGas(opts)` | Natural gas spot prices |
| `natGasStorage(opts)` | EIA weekly storage report |
| `weather(opts)` | Weather observations |
| `bpa(opts)` | BPA balancing area (wind, hydro, thermal, load) |
| `outagesSummary(iso?)` | Generator outage summary |
| `ancillary(opts)` | Ancillary service prices |
| `ancillaryLatest(iso?)` | Latest ancillary snapshot |
| `nuclearStatus(iso?)` | Nuclear plant capacity/output |
| `nuclearSummary(iso?)` | Nuclear capacity/output summary |
| `emissions(opts)` | SO2/NOx/CO2 emission rates |
| `hydroReservoirs(opts)` | Reservoir storage levels |
| `hydroReservoirsLatest()` | Latest reservoir snapshot |
| `hydroStreamflow(opts)` | USGS streamflow by site |
| `solarIrradiance(opts)` | Solar irradiance by location |
| `solarIrradianceLocations()` | Tracked irradiance stations |
| `solarIrradianceLatest()` | Latest irradiance snapshot |
| `queue(opts)` | Interconnection queue |
| `commoditiesCoal(opts)` | Coal prices by rank |
| `commoditiesPetroleum(opts)` | Petroleum spot prices |
| `commoditiesPowerBurn(opts)` | Gas consumed for power generation |
| `steoForecast()` | EIA Short-Term Energy Outlook |
| `carbonMarkets(opts)` | RGGI/WCI/VCM carbon credit prices |

Note: `outages()` (unit-level generator outages) currently returns a 500 from the hosted API - a known backend issue, not a client bug. `outagesSummary()` works.

## Links

- API docs: [data.kardashevlabs.org/docs](https://data.kardashevlabs.org/docs)
- Docs site: [docs.kardashevlabs.org](https://docs.kardashevlabs.org)
- Python equivalent: [kardashev-py](https://github.com/kardashev-lab/kardashev-py)
- Source: [github.com/kardashev-lab/kardashev-js](https://github.com/kardashev-lab/kardashev-js)
- Changelog: [CHANGELOG.md](https://github.com/kardashev-lab/kardashev-js/blob/main/CHANGELOG.md)
- Website: [kardashevlabs.org](https://kardashevlabs.org)

## License

MIT - see [LICENSE](https://github.com/kardashev-lab/kardashev-js/blob/main/LICENSE).
