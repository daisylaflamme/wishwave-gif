import { describe, expect, it } from "vitest";
import { resolveConfig } from "vite";
import publicCloudConfig from "../../public-cloud-config.json";

describe("production Cloud configuration", () => {
  it("provides public connection settings even without environment files", async () => {
    const config = await resolveConfig({ envFile: false }, "build", "production");
    expect(JSON.parse(config.define?.["import.meta.env.VITE_SUPABASE_URL"] ?? "null")).toBe(publicCloudConfig.url);
    expect(JSON.parse(config.define?.["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "null")).toBe(publicCloudConfig.publishableKey);
    expect(publicCloudConfig.url).toMatch(/^https:\/\//);
    expect(publicCloudConfig.publishableKey.length).toBeGreaterThan(20);
  });
});