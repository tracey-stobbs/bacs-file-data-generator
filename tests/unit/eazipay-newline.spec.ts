import { describe, it, expect } from "vitest";
import { eaziPayAdapter } from "../../src/lib/fileType/eazipay/generator.js";

describe("EaziPay serialization newline", () => {
  it("appends a trailing newline and preserves row count", () => {
    const rows = eaziPayAdapter.buildPreviewRows({ numberOfRows: 5 });
    const serialized = eaziPayAdapter.serialize(rows);
    expect(serialized.endsWith("\n")).toBe(true);
    const lineCount = serialized.split(/\n/).filter((l) => l.length > 0).length;
    expect(lineCount).toBe(5);
  });
});
