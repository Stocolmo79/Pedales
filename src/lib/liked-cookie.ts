export const LIKED_COOKIE = "liked_products";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseLikedCookie(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").filter((id) => UUID.test(id)));
}
