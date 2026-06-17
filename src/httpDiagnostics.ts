// src/httpDiagnostics.ts
// Formats low-level fetch failures so issue reports include the useful cause.

const ERROR_DETAIL_KEYS = [
  "code",
  "errno",
  "syscall",
  "hostname",
  "host",
  "address",
  "port",
  "reason",
];

export function formatFetchFailure(error: unknown, url: string, operation: string): string {
  const details = describeErrorChain(error);
  return `${operation} failed before receiving an HTTP response.\nURL: ${url}\n${details}`;
}

function describeErrorChain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;

  while (current && depth < 4) {
    parts.push(`${depth === 0 ? "Error" : "Cause"}: ${describeError(current)}`);
    current = getCause(current);
    depth += 1;
  }

  if (parts.length === 0) {
    return `Error: ${String(error)}`;
  }

  return parts.join("\n");
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = ERROR_DETAIL_KEYS.flatMap((key) => {
    const value = (error as unknown as Record<string, unknown>)[key];
    return value === undefined || value === "" ? [] : [`${key}=${String(value)}`];
  });

  return [error.name, error.message, details.length > 0 ? `(${details.join(", ")})` : ""]
    .filter(Boolean)
    .join(": ");
}

function getCause(error: unknown): unknown {
  if (typeof error !== "object" || error === null || !("cause" in error)) {
    return undefined;
  }

  return (error as { cause?: unknown }).cause;
}
