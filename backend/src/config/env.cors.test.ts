import { describe, expect, it } from "vitest";

import { LOCAL_DEV_ORIGINS, parseCorsOrigins } from "./env.js";

describe("parseCorsOrigins", () => {
  it("keeps the local development origins when no deployment origins are set", () => {
    expect(parseCorsOrigins(undefined)).toEqual([...LOCAL_DEV_ORIGINS]);
    expect(parseCorsOrigins("")).toEqual([...LOCAL_DEV_ORIGINS]);
  });

  it("adds explicit deployment origins and still keeps local development origins", () => {
    expect(parseCorsOrigins("http://10.250.140.136:3000, http://10.250.140.136")).toEqual([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://10.250.140.136:3000",
      "http://10.250.140.136",
    ]);
  });

  it("rejects wildcard and path origins", () => {
    expect(() => parseCorsOrigins("*")).toThrow(/explicit http\(s\) origins/);
    expect(() => parseCorsOrigins("http://10.250.140.136:3000/")).toThrow(/Invalid entry/);
  });
});
