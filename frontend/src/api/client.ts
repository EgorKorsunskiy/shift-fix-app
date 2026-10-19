export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    let code = "UNKNOWN";
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") code = body.error;
    } catch {
      code = "UNKNOWN";
    }
    throw new ApiError(response.status, code);
  }
  return (await response.json()) as T;
}

export function queryString(
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
