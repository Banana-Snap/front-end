import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decrypt, encrypt } from "./crypto";
import {
  getConnections,
  getGraph,
  login,
  LluError,
  type LluErrorCode,
} from "./llu-client";

const MIN_SYNC_INTERVAL_MS = 60_000;

export type LibreResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error:
        | LluErrorCode
        | "missing_credentials"
        | "permanent_account_required"
        | "internal";
    };

async function guard<T>(fn: () => Promise<T>): Promise<LibreResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof LluError) return { ok: false, error: e.code };
    // Solo nombre, código y mensaje (p. ej. variable de entorno faltante o error de Postgres);
    // nunca el payload (tiene la contraseña) ni `details` de Postgres (puede incluir la fila).
    const err = (e ?? {}) as {
      name?: unknown;
      code?: unknown;
      message?: unknown;
    };
    console.error("libre: error interno", {
      name: String(err.name ?? typeof e),
      code: err.code === undefined ? undefined : String(err.code),
      message: String(err.message ?? "").slice(0, 300),
    });
    return { ok: false, error: "internal" };
  }
}

export function connectLibreForUser(
  userId: string,
  input: { email: string; password: string; patientId?: string },
) {
  return guard(async () => {
    const session = await login(input.email.trim(), input.password);
    const connections = await getConnections(session);
    const chosen =
      connections.find((c) => c.patientId === input.patientId) ??
      connections[0];
    if (!chosen) throw new LluError("no_connection");

    const { error } = await supabaseAdmin.from("cgm_connections").upsert({
      user_id: userId,
      provider: "librelinkup",
      region_base_url: session.baseUrl,
      token_ciphertext: await encrypt(session.token),
      account_id_hash: session.accountId,
      patient_id: chosen.patientId,
      token_expires_at: session.expiresAt!.toISOString(),
      last_synced_at: null,
    });
    if (error) throw error;

    return {
      selected: chosen.patientId,
      patients: connections.map((c) => ({
        patientId: c.patientId,
        name: `${c.firstName} ${c.lastName}`.trim(),
      })),
    };
  });
}

// sync = false: solo lo guardado en la base (rápido, para el primer render).
// sync = true: además trae lo nuevo de LibreLinkUp si pasó MIN_SYNC_INTERVAL_MS.
export function readLibreForUser(userId: string, { sync }: { sync: boolean }) {
  return guard(async () => {
    const { data: conn, error: connError } = await supabaseAdmin
      .from("cgm_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (connError) throw connError;
    if (!conn) return { connected: false as const, readings: [] };

    const stale =
      sync &&
      (!conn.last_synced_at ||
        Date.now() - Date.parse(conn.last_synced_at) > MIN_SYNC_INTERVAL_MS);
    if (stale) {
      if (Date.parse(conn.token_expires_at) <= Date.now())
        throw new LluError("expired");
      const readings = await getGraph(
        {
          baseUrl: conn.region_base_url,
          token: await decrypt(conn.token_ciphertext),
          accountId: conn.account_id_hash,
        },
        conn.patient_id,
      );
      if (readings.length > 0) {
        const { error } = await supabaseAdmin.from("glucose_readings").upsert(
          readings.map((r) => ({
            user_id: userId,
            source: "librelinkup",
            measured_at: r.measuredAt,
            value_mg_dl: r.valueMgDl,
            trend: r.trend,
          })),
          { onConflict: "user_id,source,measured_at", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      await supabaseAdmin
        .from("cgm_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("glucose_readings")
      .select("measured_at, value_mg_dl, trend")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: false });
    if (error) throw error;
    return { connected: true as const, readings: rows ?? [] };
  });
}

export function disconnectLibreForUser(userId: string) {
  return guard(async () => {
    const { error } = await supabaseAdmin
      .from("cgm_connections")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
    return null;
  });
}
