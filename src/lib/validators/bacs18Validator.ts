import type { CommonTransactionCode } from "../../types.js";
export const Bacs18Validator = {
  allowedTypes: ["DAILY", "MULTI"] as const,
  isValidType(t: string | undefined): t is "DAILY" | "MULTI" {
    return !!t && (t === "DAILY" || t === "MULTI");
  },
  getLineLength(type: "DAILY" | "MULTI"): number {
    return type === "DAILY" ? 100 : 106;
  },
  allowedTransactionCodes: ["01", "17", "18", "99", "0C", "0N", "0S"] as const,
  isTransactionCode(code: unknown): code is CommonTransactionCode {
    return (
      typeof code === "string" &&
      (Bacs18Validator.allowedTransactionCodes as readonly string[]).includes(
        code
      )
    );
  },
} as const;
