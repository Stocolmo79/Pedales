export const CATEGORIES = {
  pedal: "Pedales",
  lp: "Vinilos (LP)",
} as const;

export type Category = keyof typeof CATEGORIES;

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && Object.hasOwn(CATEGORIES, value);
}
