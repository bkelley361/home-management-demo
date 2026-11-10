/**
 * Money helpers.
 *
 * Amounts are stored as integer cents everywhere (`expenses.amount_cents`,
 * `*.purchase_price_cents`) — never floats. `0.1 + 0.2 !== 0.3`, and a currency
 * column that drifts by a cent is a bug you find months later in a total.
 *
 * Every amount the user types goes in through `parseAmountToCents` and every
 * amount displayed comes out through `formatCents`.
 */

/**
 * Parse a user-typed amount into integer cents.
 *
 * Returns `null` for anything unusable, so callers can show a validation error
 * rather than silently writing a wrong number. Tolerates currency symbols,
 * thousands separators, and surrounding whitespace.
 *
 *   '12.5'      → 1250
 *   '$1,200.00' → 120000
 *   '0.999'     → 100    (rounded, not truncated)
 *   ''  / 'abc' / '-5' → null
 */
export function parseAmountToCents(input: string): number | null {
  if (typeof input !== 'string') return null;

  // Strip currency symbols, spaces, and thousands separators.
  const cleaned = input.replace(/[$\s,]/g, '');
  if (!cleaned) return null;

  // Reject anything that isn't a plain non-negative decimal. This also rejects
  // the leading '-' rather than quietly storing a negative expense.
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  // Round rather than truncate so '0.999' doesn't become 99 cents.
  return Math.round(value * 100);
}

/** Format integer cents for display, e.g. 120000 → '$1,200.00'. */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return '$0.00';
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

/** Sum a list of cent amounts. Kept here so totals never touch floats. */
export function sumCents(amounts: (number | null | undefined)[]): number {
  return amounts.reduce<number>((total, n) => total + (Number.isFinite(n) ? (n as number) : 0), 0);
}

/**
 * Integer cents as an editable decimal string, for seeding a form field from a
 * stored value. Deliberately unformatted — no symbol or separators — so it can
 * round-trip back through `parseAmountToCents`.
 */
export function centsToInputValue(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2);
}
