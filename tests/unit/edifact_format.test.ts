import { describe, expect, it } from "vitest";

import { EdifactFormat, getFormatOfPruefidentifikator } from "../../src/edifact_format";

describe("getFormatOfPruefidentifikator", () => {
  it.each([
    ["11042", EdifactFormat.UTILMD],
    ["13002", EdifactFormat.MSCONS],
    ["25001", EdifactFormat.UTILTS],
    ["11001", EdifactFormat.UTILMD],
    ["44001", EdifactFormat.UTILMDG],
    ["55001", EdifactFormat.UTILMDS],
  ])("maps %s to %s", (pruefi, expected) => {
    expect(getFormatOfPruefidentifikator(pruefi)).toBe(expected);
  });

  it.each(["", "asdas", "01234"])("throws for illegal pruefi '%s'", (pruefi) => {
    expect(() => getFormatOfPruefidentifikator(pruefi)).toThrow(Error);
  });

  it("throws with descriptive message for unmapped pruefi", () => {
    expect(() => getFormatOfPruefidentifikator("10000")).toThrow(
      "No Edifact format was found for pruefidentifikator"
    );
  });
});

describe("EdifactFormat", () => {
  it("has string value equal to its name", () => {
    expect(EdifactFormat.UTILMD).toBe("UTILMD");
  });
});
