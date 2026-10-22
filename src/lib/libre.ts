import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  connectLibreForUser,
  disconnectLibreForUser,
  readLibreForUser,
} from "@/server/libre/service";

export const connectLibre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { email: string; password: string; patientId?: string }) => {
      if (!d?.email?.trim() || !d?.password)
        throw new Error("missing_credentials");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    if (context.claims.is_anonymous)
      return {
        ok: false as const,
        error: "permanent_account_required" as const,
      };
    return connectLibreForUser(context.userId, data);
  });

// Rápida: solo lo que ya está guardado
export const readLibre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => readLibreForUser(context.userId, { sync: false }));

// Lenta: consulta a LibreLinkUp (como mucho una vez por minuto) y devuelve lo actualizado
export const syncLibre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => readLibreForUser(context.userId, { sync: true }));

export const disconnectLibre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => disconnectLibreForUser(context.userId));
