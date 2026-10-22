// Cliente mínimo de la API (no oficial) de LibreLinkUp, la que usa la app de seguidores de Abbott.
// Basado en https://github.com/DiaKEM/libre-link-up-api-client, reescrito con fetch para poder
// persistir el token y testear sin red.

const DEFAULT_BASE_URL = "https://api-us.libreview.io";

// La API rechaza versiones viejas: configurable para no redeployar si Abbott la sube.
function clientVersion(): string {
  return process.env["LLU_CLIENT_VERSION"] ?? "4.16.0";
}

export type LluErrorCode =
  | "bad_credentials"
  | "action_required"
  | "expired"
  | "rate_limited"
  | "no_connection"
  | "upstream";

export class LluError extends Error {
  constructor(public code: LluErrorCode) {
    super(code);
    this.name = "LluError";
  }
}

export interface LluSession {
  baseUrl: string;
  token: string;
  accountId: string;
  expiresAt?: Date;
}

export interface LluConnection {
  patientId: string;
  firstName: string;
  lastName: string;
}

export interface Reading {
  measuredAt: string;
  valueMgDl: number;
  trend: number | null;
}

type FetchFn = typeof fetch;

function buildHeaders(session?: LluSession): Record<string, string> {
  return {
    product: "llu.android",
    version: clientVersion(),
    "content-type": "application/json",
    accept: "application/json",
    "cache-control": "no-cache",
    ...(session
      ? {
          authorization: `Bearer ${session.token}`,
          "account-id": session.accountId,
        }
      : {}),
  };
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function login(
  email: string,
  password: string,
  fetchFn: FetchFn = fetch,
  baseUrl = DEFAULT_BASE_URL,
): Promise<LluSession> {
  // Máximo una redirección de región
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchFn(`${baseUrl}/llu/auth/login`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 429) throw new LluError("rate_limited");
    const body = await res.json().catch(() => ({}));
    if (body.status === 2) throw new LluError("bad_credentials");
    if (body.status === 4) throw new LluError("action_required"); // aceptar términos en la app LibreLinkUp
    if (body.data?.redirect && body.data?.region) {
      baseUrl = `https://api-${body.data.region}.libreview.io`;
      continue;
    }
    const token = body.data?.authTicket?.token;
    const userId = body.data?.user?.id;
    const expires = body.data?.authTicket?.expires; // epoch en segundos
    if (!token || !userId || !expires) throw new LluError("upstream");
    return {
      baseUrl,
      token,
      accountId: await sha256Hex(userId),
      expiresAt: new Date(expires * 1000),
    };
  }
  throw new LluError("upstream");
}

async function authedGet(session: LluSession, path: string, fetchFn: FetchFn) {
  const res = await fetchFn(`${session.baseUrl}${path}`, {
    headers: buildHeaders(session),
  });
  if (res.status === 401) throw new LluError("expired");
  if (res.status === 429) throw new LluError("rate_limited");
  if (!res.ok) throw new LluError("upstream");
  return await res.json();
}

export async function getConnections(
  session: LluSession,
  fetchFn: FetchFn = fetch,
): Promise<LluConnection[]> {
  const body = await authedGet(session, "/llu/connections", fetchFn);
  return (body.data ?? []).map(
    (c: { patientId: string; firstName?: string; lastName?: string }) => ({
      patientId: c.patientId,
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
    }),
  );
}

export async function getGraph(
  session: LluSession,
  patientId: string,
  fetchFn: FetchFn = fetch,
): Promise<Reading[]> {
  const body = await authedGet(
    session,
    `/llu/connections/${encodeURIComponent(patientId)}/graph`,
    fetchFn,
  );
  return toReadings(body.data ?? {});
}

// FactoryTimestamp viene en UTC con formato "M/D/YYYY h:mm:ss AM"
export function parseFactoryTimestamp(value: string): string | null {
  const m = value?.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/,
  );
  if (!m) return null;
  // El regex garantiza los 7 grupos; m.map(Number) los deja tipados como number | undefined
  const [, month, day, year, h, minute, second] = m.map(Number);
  let hour = h! % 12;
  if (m[7] === "PM") hour += 12;
  return new Date(
    Date.UTC(year!, month! - 1, day!, hour, minute!, second!),
  ).toISOString();
}

interface RawMeasurement {
  FactoryTimestamp?: string;
  ValueInMgPerDl?: number;
  TrendArrow?: number;
}

export function toReadings(data: {
  graphData?: RawMeasurement[];
  connection?: { glucoseMeasurement?: RawMeasurement };
}): Reading[] {
  const items: RawMeasurement[] = [...(data.graphData ?? [])];
  if (data.connection?.glucoseMeasurement)
    items.push(data.connection.glucoseMeasurement);
  const byTime = new Map<string, Reading>();
  for (const item of items) {
    const measuredAt = parseFactoryTimestamp(item.FactoryTimestamp ?? "");
    const value = Number(item.ValueInMgPerDl);
    if (!measuredAt || !Number.isFinite(value)) continue;
    // Solo la medición actual trae TrendArrow (1 = bajando rápido … 5 = subiendo rápido)
    byTime.set(measuredAt, {
      measuredAt,
      valueMgDl: Math.round(value),
      trend: item.TrendArrow ?? null,
    });
  }
  return [...byTime.values()];
}
