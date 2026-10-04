import { describe, expect, it, vi } from "vitest";

// index.js is what Firebase deploys. Importing it here (without a database
// connection string) checks that both functions are exported with the
// settings we expect. __endpoint is the description Firebase reads at deploy.
vi.spyOn(console, "error").mockImplementation(() => {});
const { api, apiv2 } = await import("../index.js");

describe("deployed functions", () => {
  it("exports apiv2 as a 2nd generation HTTPS function in us-central1", () => {
    expect(apiv2.__endpoint.platform).toBe("gcfv2");
    expect(apiv2.__endpoint.region).toEqual(["us-central1"]);
    expect(apiv2.__endpoint.httpsTrigger).toBeDefined();
  });

  it("caps apiv2 at 10 instances, each handling up to 80 requests", () => {
    expect(apiv2.__endpoint.maxInstances).toBe(10);
    expect(apiv2.__endpoint.concurrency).toBe(80);
  });

  it("keeps the old api as a 1st generation function during the switch-over", () => {
    expect(api.__endpoint.platform).toBe("gcfv1");
    expect(api.__endpoint.httpsTrigger).toBeDefined();
  });
});
