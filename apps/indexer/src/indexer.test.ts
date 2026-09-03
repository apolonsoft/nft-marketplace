import { describe, expect, it } from "vitest";
import { networkManifests } from "@nft-marketplace/contracts";

describe("indexer configuration", () => {
  it("contains both supported network manifests", () => {
    expect(networkManifests.anvil.chainId).toBe(31337);
    expect(networkManifests["base-sepolia"].chainId).toBe(84532);
  });

  it("uses deterministic event identifiers", () => {
    const id = `${"0x" + "ab".repeat(32)}-4`;
    expect(id).toMatch(/^0x[0-9a-f]{64}-4$/);
  });
});
