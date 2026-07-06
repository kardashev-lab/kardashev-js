import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "../src/client";

describe("Client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => [{ iso: "CAISO", ts: "2026-07-07T06:55:00Z", lbs_co2_per_mwh: 463.0 }],
    }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the default base URL", async () => {
    const client = new Client();
    await client.carbonLatest("caiso");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("https://data.kardashevlabs.org/carbon/latest?iso=CAISO");
  });

  it("respects a custom base URL", async () => {
    const client = new Client({ baseUrl: "http://localhost:8000/" });
    await client.fuelMix("ercot");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("http://localhost:8000/fuel-mix?iso=ERCOT&hours=24&limit=2000");
  });

  it("maps camelCase options to snake_case query params", async () => {
    const client = new Client();
    await client.lmp("pjm", { nodeId: "51291", market: "da" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("node_id=51291");
    expect(url).toContain("market=DA");
  });

  it("omits undefined params instead of sending them as literal 'undefined'", async () => {
    const client = new Client();
    await client.queue();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("iso=");
    expect(url).not.toContain("status=");
  });

  it("returns parsed JSON", async () => {
    const client = new Client();
    const rows = await client.carbonLatest("CAISO");
    expect(rows).toEqual([{ iso: "CAISO", ts: "2026-07-07T06:55:00Z", lbs_co2_per_mwh: 463.0 }]);
  });

  it("throws with status info on a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
    });
    const client = new Client();
    await expect(client.carbonLatest("XX")).rejects.toThrow(/404/);
  });
});
