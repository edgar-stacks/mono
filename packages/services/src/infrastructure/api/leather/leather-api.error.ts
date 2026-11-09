export interface LeatherApiErrorData {
  error: string;
  code?: string;
  reason?: string;
}

export class LeatherApiError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: LeatherApiErrorData
  ) {
    const baseMessage = `Leather API (${url}): ${status} ${statusText}`;
    super(data?.error ? `${baseMessage} — ${data.error}` : baseMessage);
    this.name = 'LeatherApiError';
  }

  static isLeatherApiError(error: unknown) {
    return error instanceof LeatherApiError;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isUnprocessableEntity(): boolean {
    return this.status === 422;
  }
}

export function getErrorDetail(error: unknown): string | undefined {
  if (LeatherApiError.isLeatherApiError(error) && error.data?.error.trim()) {
    return error.data.error.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return undefined;
}

function readOptionalString(body: object, key: string) {
  const value: unknown = key in body ? Reflect.get(body, key) : undefined;
  return typeof value === 'string' ? value : undefined;
}

export async function readLeatherApiErrorData(
  response: Response
): Promise<LeatherApiErrorData | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (!body || typeof body !== 'object') return undefined;
    const error = readOptionalString(body, 'error');
    const code = readOptionalString(body, 'code');
    const reason = readOptionalString(body, 'reason');
    const message = error ?? code;
    if (message !== undefined) {
      return {
        error: message,
        ...(code ? { code } : {}),
        ...(reason ? { reason } : {}),
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function assertLeatherApiData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('Leather API returned an empty response');
  return data;
}
