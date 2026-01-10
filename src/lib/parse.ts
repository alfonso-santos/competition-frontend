// src/lib/parse.ts

/**
 * Split a free-form list of number tokens using whitespace / comma / semicolon
 * and normalize cases like "- 0.8" => "-0.8" and "+ 0.2" => "+0.2".
 *
 * This keeps the UI rules consistent across:
 * - parsing weights text
 * - counting typed decimals for validation
 */
export function splitAndNormalizeNumberTokens(text: string): string[] {
  const raw = String(text ?? "")
    .trim()
    .replace(/\r/g, "")
    // commas are separators; decimals must use "."
    .split(/[\s,;]+/)
    .filter(Boolean);

  if (!raw.length) return [];

  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const tok = String(raw[i] ?? "").trim();

    // Merge separated sign: ["-", "0.8"] => ["-0.8"]
    if ((tok === "-" || tok === "+") && i + 1 < raw.length) {
      const next = String(raw[i + 1] ?? "").trim();

      // next must look like a plain numeric token WITHOUT sign
      // (we keep it strict: require at least one digit before the dot)
      if (/^\d+(\.\d+)?$/.test(next)) {
        out.push(tok + next);
        i += 1; // consume next
        continue;
      }
    }

    out.push(tok);
  }

  return out;
}

export function parseNumber(input: string): number | null {
  // Remove all whitespace to allow cases like "- 0.8"
  const t = String(input ?? "").trim().replace(/\s+/g, "");
  if (!t) return null;

  // Decimals must use "." (so "0,2" is not a valid number token here)
  if (t.includes(",")) return null;

  // Avoid scientific notation (e.g., 1e-3) to keep the UI rules simple/explicit
  if (/[eE]/.test(t)) return null;

  // Basic numeric token with optional sign and optional decimals
  // We keep it strict: require at least one digit before the dot.
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null;

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Counts how many decimal digits the user typed, without converting to Number.
 * - "0.2" => 1
 * - "0.2000" => 4
 * - "10" => 0
 * - invalid formats => 999 to force "invalid" style validation
 */
export function countDecimalsToken(token: string): number {
  // Remove all whitespace to allow cases like "- 0.8"
  const t = String(token ?? "").trim().replace(/\s+/g, "");
  if (!t) return 0;

  // If user uses comma or scientific notation, treat as invalid for "typed decimals"
  if (t.includes(",") || /[eE]/.test(t)) return 999;

  // Allow optional sign, digits, optional decimal part
  const m = t.match(/^[+-]?(\d+)(?:\.(\d+))?$/);
  if (!m) return 999;

  const dec = m[2] ?? "";
  return dec.length;
}

export function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return n;
  const d = Math.max(0, Math.floor(decimals));
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

export function parseWeightsText(
  text: string,
  nAssets: number
): { ok: true; weights: number[] } | { ok: false; error: string } {
  const tokens = splitAndNormalizeNumberTokens(text);

  if (!tokens.length) return { ok: false, error: "Please paste your weights." };
  if (!nAssets) return { ok: false, error: "Contest rules missing (n_assets)." };

  if (tokens.length !== nAssets) {
    return { ok: false, error: `Expected ${nAssets} weights, got ${tokens.length}.` };
  }

  const nums: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const n = parseNumber(tokens[i]);
    if (n === null) {
      return {
        ok: false,
        error: `Invalid number at position ${i + 1}. Use "." for decimals.`,
      };
    }
    nums.push(n);
  }

  return { ok: true, weights: nums };
}

export function validateWeightsSign(
  weights: number[],
  allowShort: boolean
): { ok: true } | { ok: false; error: string } {
  if (allowShort) return { ok: true };
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] < 0) return { ok: false, error: `Weight ${i + 1} must be ≥ 0.` };
  }
  return { ok: true };
}
