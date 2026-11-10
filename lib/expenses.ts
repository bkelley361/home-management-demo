/**
 * Expense categories and helpers.
 *
 * The category values map 1:1 to the Cost Tracking bullets in features.md, so
 * the deferred analytics work (cost-by-category, budgets, export) can group on
 * them without a schema migration or a backfill.
 */

export const EXPENSE_CATEGORIES = [
  { value: 'repair', label: 'Repair' },
  { value: 'part', label: 'Part' },
  { value: 'tool', label: 'Tool' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'recurring_service', label: 'Recurring service' },
  { value: 'other', label: 'Other' },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];

export function expenseCategoryLabel(value?: string | null): string {
  if (!value) return 'Other';
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
