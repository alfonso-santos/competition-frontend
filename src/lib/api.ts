import { auth } from "./firebase";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL (check .env.local and restart npm run dev).");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated. Please log in.");
  }

  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const text = await res.text();
  const maybeJson = tryParseJson(text);
  const data = (maybeJson ?? text) as any;

  if (!res.ok) {
    const detail = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }

  return data as T;
}

export async function publicFetch<T = unknown>(path: string): Promise<T> {
  if (!BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL (check .env.local and restart npm run dev).");
  }
  const res = await fetch(`${BASE_URL}${path}`);
  const text = await res.text();
  const maybeJson = tryParseJson(text);
  const data = (maybeJson ?? text) as any;

  if (!res.ok) {
    const detail = data?.detail || data?.message || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }

  return data as T;
}
