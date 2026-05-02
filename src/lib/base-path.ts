const BASE = import.meta.env.BASE_URL || "/";

export function assetUrl(path: string): string {
  return `${BASE}${path.startsWith("/") ? path.slice(1) : path}`;
}
