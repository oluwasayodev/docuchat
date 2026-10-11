import { API_BASE } from "@/lib/api/config";
import { clearSession, getSessionSnapshot, setSession } from "@/lib/auth/session";
import type { AuthResponse } from "@/lib/api/types";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, unknown>;

  constructor(status: number, message: string, fields?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export interface SseFrame {
  event: string;
  data: string;
}

let refreshInFlight: Promise<AuthResponse | null> | null = null;

async function refreshSession(): Promise<AuthResponse | null> {
  const session = getSessionSnapshot();
  if (!session?.refreshToken) return null;

  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/token/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!response.ok) return null;
      const next = (await response.json()) as AuthResponse;
      setSession(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let fields: Record<string, unknown> | undefined;
  try {
    const text = await response.text();
    if (text) {
      const data = JSON.parse(text) as {
        message?: string;
        fields?: Record<string, unknown>;
        errors?: { property: string; constraints?: Record<string, string> }[];
      };
      if (data.message) {
        message = data.message;
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        message = data.errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(", ") || message;
        fields = { errors: data.errors };
      }
      fields = fields ?? data.fields;
    }
  } catch {
    void 0;
  }
  return new ApiError(response.status, message, fields);
}

async function requestResponse(
  path: string,
  options: ApiFetchOptions,
  allowRefresh: boolean,
): Promise<Response> {
  const { body, headers: initHeaders, ...rest } = options;
  const session = getSessionSnapshot();

  const headers = new Headers(initHeaders);
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body:
      body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (response.status === 401 && allowRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) return requestResponse(path, options, false);
    clearSession();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await requestResponse(path, options, true);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiFetchBlob(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Blob> {
  const response = await requestResponse(path, options, true);
  return await response.blob();
}

function parseFrame(raw: string): SseFrame | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

export async function* streamSse(
  path: string,
  options: ApiFetchOptions = {},
): AsyncGenerator<SseFrame> {
  const response = await requestResponse(path, options, true);
  if (!response.body) {
    throw new ApiError(response.status, "Streaming is not supported by this response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (frame) yield frame;
        boundary = buffer.indexOf("\n\n");
      }
    }
    const tail = parseFrame(buffer.trim());
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
