import { invoke } from "@tauri-apps/api/core";

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

export async function call<T>(command: string, args?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw normalizeError(error);
  }
}

export function normalizeError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "message" in error) {
    const candidate = error as Partial<ApiError>;
    return {
      code: candidate.code ?? "unknown_error",
      message: candidate.message ?? "Unexpected error",
      details: candidate.details,
    };
  }

  return {
    code: "unknown_error",
    message: typeof error === "string" ? error : "Unexpected error",
  };
}
