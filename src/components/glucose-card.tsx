import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Apple, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Language } from "@/lib/language";
import {
  connectLibre,
  disconnectLibre,
  readLibre,
  syncLibre,
} from "@/lib/libre";
import { nutrientAmount, nutrientLabels } from "@/lib/nutrition";

const PRIMARY = "#44bcc5";
const MEAL_COLOR = "#e5484d";
const Y_MAX = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
// Zona de tiempo en rango (TIR) por defecto, en mg/dL; cada usuario puede cambiarla
type Tir = { low: number; high: number };
const DEFAULT_TIR: Tir = { low: 63, high: 140 };
const TIR_MIN = 40;
const TIR_MAX = 300;

type ErrorCode =
  | "bad_credentials"
  | "action_required"
  | "expired"
  | "rate_limited"
  | "no_connection"
  | "permanent_account_required"
  | "missing_credentials"
  | "upstream"
  | "internal";

type Copy = {
  title: string;
  connectTitle: string;
  connectHelp: string;
  email: string;
  password: string;
  connect: string;
  showPassword: string;
  hidePassword: string;
  disconnect: string;
  loading: string;
  empty: string;
  last: string;
  meal: string;
  tir: string;
  tirLow: string;
  tirHigh: string;
  tirInvalid: string;
  save: string;
  cancel: string;
  errors: Record<ErrorCode, string>;
};

const copy = {
  es: {
    title: "Glucosa",
    connectTitle: "Conectá LibreLinkUp",
    connectHelp:
      "Usá el correo y la contraseña de tu cuenta seguidora de LibreLinkUp. No guardamos tu contraseña.",
    email: "Correo de LibreLinkUp",
    password: "Contraseña",
    connect: "Conectar",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    disconnect: "Desconectar",
    loading: "Cargando…",
    empty: "Todavía no hay mediciones.",
    last: "Última medición",
    meal: "Comida",
    tir: "TIR",
    tirLow: "Mínimo (mg/dL)",
    tirHigh: "Máximo (mg/dL)",
    tirInvalid:
      "Ingresá números enteros entre 40 y 300, con el mínimo menor que el máximo.",
    save: "Guardar",
    cancel: "Cancelar",
    errors: {
      bad_credentials: "Correo o contraseña incorrectos.",
      action_required:
        "Abrí la app LibreLinkUp y aceptá los términos pendientes.",
      expired: "La conexión venció. Volvé a conectar.",
      rate_limited: "Demasiados intentos. Probá en unos minutos.",
      no_connection: "Esa cuenta no sigue a ningún paciente.",
      permanent_account_required: "Necesitás una cuenta registrada.",
      missing_credentials: "Completá correo y contraseña.",
      upstream: "LibreLinkUp no respondió. Probá más tarde.",
      internal: "Ocurrió un error. Probá más tarde.",
    },
  },
  en: {
    title: "Glucose",
    connectTitle: "Connect LibreLinkUp",
    connectHelp:
      "Use the email and password of your LibreLinkUp follower account. We don't store your password.",
    email: "LibreLinkUp email",
    password: "Password",
    connect: "Connect",
    showPassword: "Show password",
    hidePassword: "Hide password",
    disconnect: "Disconnect",
    loading: "Loading…",
    empty: "No readings yet.",
    last: "Latest reading",
    meal: "Meal",
    tir: "TIR",
    tirLow: "Low (mg/dL)",
    tirHigh: "High (mg/dL)",
    tirInvalid:
      "Enter whole numbers between 40 and 300, with the low below the high.",
    save: "Save",
    cancel: "Cancel",
    errors: {
      bad_credentials: "Incorrect email or password.",
      action_required: "Open the LibreLinkUp app and accept the pending terms.",
      expired: "The connection expired. Please connect again.",
      rate_limited: "Too many attempts. Try again in a few minutes.",
      no_connection: "That account doesn't follow any patient.",
      permanent_account_required: "You need a registered account.",
      missing_credentials: "Enter your email and password.",
      upstream: "LibreLinkUp didn't respond. Try again later.",
      internal: "Something went wrong. Try again later.",
    },
  },
  it: {
    title: "Glicemia",
    connectTitle: "Collega LibreLinkUp",
    connectHelp:
      "Usa l'email e la password del tuo account follower di LibreLinkUp. Non salviamo la tua password.",
    email: "Email di LibreLinkUp",
    password: "Password",
    connect: "Collega",
    showPassword: "Mostra password",
    hidePassword: "Nascondi password",
    disconnect: "Scollega",
    loading: "Caricamento…",
    empty: "Ancora nessuna misurazione.",
    last: "Ultima misurazione",
    meal: "Pasto",
    tir: "TIR",
    tirLow: "Minimo (mg/dL)",
    tirHigh: "Massimo (mg/dL)",
    tirInvalid:
      "Inserisci numeri interi tra 40 e 300, con il minimo inferiore al massimo.",
    save: "Salva",
    cancel: "Annulla",
    errors: {
      bad_credentials: "Email o password errate.",
      action_required: "Apri l'app LibreLinkUp e accetta i termini in sospeso.",
      expired: "La connessione è scaduta. Collegati di nuovo.",
      rate_limited: "Troppi tentativi. Riprova tra qualche minuto.",
      no_connection: "Questo account non segue nessun paziente.",
      permanent_account_required: "Ti serve un account registrato.",
      missing_credentials: "Inserisci email e password.",
      upstream: "LibreLinkUp non ha risposto. Riprova più tardi.",
      internal: "Si è verificato un errore. Riprova più tardi.",
    },
  },
} satisfies Record<Language, Copy>;

// TrendArrow de LibreLinkUp: 1 bajando rápido … 5 subiendo rápido
const TREND_ARROWS: Record<number, string> = {
  1: "↓",
  2: "↘",
  3: "→",
  4: "↗",
  5: "↑",
};

const CARD =
  "mx-auto w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg md:max-w-none";

const SLOT_MS = 15 * 60 * 1000;

// Un punto por tramo de 15 min (la lectura más reciente de cada tramo), ordenados en el tiempo.
// LibreLinkUp mezcla el historial cada 15 min con la medición del último minuto de cada sincronización.
function toFifteenMinutePoints(
  readings: { measured_at: string; value_mg_dl: number }[],
): { x: number; y: number }[] {
  const bySlot = new Map<number, { x: number; y: number }>();
  for (const r of readings) {
    const x = new Date(r.measured_at).getTime();
    const slot = Math.floor(x / SLOT_MS);
    const current = bySlot.get(slot);
    if (!current || x > current.x) bySlot.set(slot, { x, y: r.value_mg_dl });
  }
  return [...bySlot.values()].sort((a, b) => a.x - b.x);
}

const HOUR_MS = 60 * 60 * 1000;

// Marcas del eje X en horas en punto (hora local), cada 1, 2 o 3 h según el rango para que no se encimen.
function hourTicks(min: number, max: number): number[] {
  if (max <= min) return [];
  const spanHours = (max - min) / HOUR_MS;
  const step = spanHours <= 6 ? 1 : spanHours <= 12 ? 2 : 3;
  const start = new Date(min);
  start.setMinutes(0, 0, 0);
  if (start.getTime() < min) start.setHours(start.getHours() + 1);
  const ticks: number[] = [];
  for (let t = start.getTime(); t <= max; t += HOUR_MS) {
    if (new Date(t).getHours() % step === 0) ticks.push(t);
  }
  return ticks;
}

type Meal = { x: number; title: string; carbs: number };

async function fetchMeals(
  userId: string,
  start: number,
  end: number,
): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("foods")
    .select("created_at, title, is_manual, is_edited, foods")
    .eq("user_id", userId)
    .gte("created_at", new Date(start).toISOString())
    .lte("created_at", new Date(end).toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    x: new Date(row.created_at).getTime(),
    title: row.title ?? "",
    carbs: Math.round(nutrientAmount(row, "carbohydrates")),
  }));
}

// Manzana dibujada en la parte de arriba del gráfico, con tooltip nativo
// El TIR se guarda en user_preferences.preferences.glucose_target (RLS: cada uno la suya)
type Preferences = { [key: string]: Json | undefined };

async function fetchPreferences(userId: string): Promise<Preferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const prefs = data?.preferences;
  return prefs && typeof prefs === "object" && !Array.isArray(prefs)
    ? prefs
    : {};
}

function isValidTir(low: number, high: number): boolean {
  return (
    Number.isInteger(low) &&
    Number.isInteger(high) &&
    low >= TIR_MIN &&
    high <= TIR_MAX &&
    low < high
  );
}

function tirFrom(prefs: Preferences): Tir {
  const raw = prefs["glucose_target"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_TIR;
  const low = Number(raw["low"]);
  const high = Number(raw["high"]);
  return isValidTir(low, high) ? { low, high } : DEFAULT_TIR;
}

// Conserva el resto de las preferencias que pudiera haber en la fila
async function saveTir(
  userId: string,
  prefs: Preferences,
  tir: Tir,
): Promise<Preferences> {
  const preferences: Preferences = { ...prefs, glucose_target: tir };
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, preferences }, { onConflict: "user_id" });
  if (error) throw error;
  return preferences;
}

function MealMarker({
  cx,
  cy,
  label,
}: {
  cx: number | undefined;
  cy: number | undefined;
  label: string;
}) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <title>{label}</title>
      <Apple
        x={cx - 8}
        y={cy - 8}
        width={16}
        height={16}
        color={MEAL_COLOR}
        strokeWidth={2.25}
      />
    </g>
  );
}

export function GlucoseCard({
  userId,
  language,
}: {
  userId: string;
  language: Language;
}) {
  const t: Copy = copy[language];
  const queryClient = useQueryClient();
  const read = useServerFn(readLibre);
  const sync = useServerFn(syncLibre);
  const connect = useServerFn(connectLibre);
  const disconnect = useServerFn(disconnectLibre);

  // 1) Lo guardado en la base: rápido, para pintar enseguida
  const { data, isLoading } = useQuery({
    queryKey: ["libre-readings"],
    queryFn: () => read(),
  });
  const connected = data?.ok === true && data.data.connected;

  // 2) En paralelo y cada 60 s: traer lo nuevo de LibreLinkUp y reemplazar lo mostrado
  useQuery({
    queryKey: ["libre-sync"],
    queryFn: async () => {
      const result = await sync();
      // Ante una falla pasajera de LibreLinkUp se sigue viendo lo último guardado;
      // si la conexión venció, se muestra el formulario para reconectar.
      if (result.ok || result.error === "expired")
        queryClient.setQueryData(["libre-readings"], result);
      return result.ok;
    },
    enabled: connected,
    refetchInterval: 60_000,
  });

  // 3) Comidas de las últimas 24 h, sin esperar a la glucosa (RLS: solo las propias)
  const { data: meals = [] } = useQuery({
    queryKey: ["glucose-meals", userId],
    queryFn: () => fetchMeals(userId, Date.now() - DAY_MS, Date.now()),
    refetchInterval: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      connect({ data: vars }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: ["libre-readings"] });
      queryClient.invalidateQueries({ queryKey: ["libre-sync"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["libre-readings"] }),
  });

  const { data: preferences = {} } = useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: () => fetchPreferences(userId),
  });
  const tir = tirFrom(preferences);
  const [editingTir, setEditingTir] = useState(false);
  const tirMutation = useMutation({
    mutationFn: (next: Tir) => saveTir(userId, preferences, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(["user-preferences", userId], saved);
      setEditingTir(false);
    },
  });

  if (isLoading || !data) {
    return (
      <section className={CARD}>
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </section>
    );
  }

  if (!connected) {
    let error: ErrorCode | null = !data.ok ? data.error : null;
    if (connectMutation.data && !connectMutation.data.ok)
      error = connectMutation.data.error;
    if (connectMutation.isError) error = "internal";
    return (
      <ConnectForm
        t={t}
        error={error}
        busy={connectMutation.isPending}
        onSubmit={(email, password) =>
          connectMutation.mutate({ email, password })
        }
      />
    );
  }

  // Vienen de la más nueva a la más vieja
  const readings = data.ok && data.data.connected ? data.data.readings : [];
  const latest = readings[0];
  const chartData = toFifteenMinutePoints(readings);
  const rangeStart = chartData[0]?.x ?? 0;
  // El gráfico llega hasta ahora aunque LibreLinkUp todavía no tenga lecturas recientes
  // (p. ej. sensores que solo suben datos al escanear): así se ven las comidas de ese tramo.
  const rangeEnd = Math.max(
    chartData[chartData.length - 1]?.x ?? 0,
    Date.now(),
  );
  // Solo las comidas que caen dentro del rango que muestra el gráfico
  const visibleMeals = meals.filter(
    (meal) => meal.x >= rangeStart && meal.x <= rangeEnd,
  );
  const carbsLabel = nutrientLabels[language].carbohydrates;

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-lg font-black text-foreground">
          {t.title}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingTir((open) => !open)}
            aria-expanded={editingTir}
            className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-primary"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t.tir} {tir.low}–{tir.high}
          </button>
          <button
            type="button"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="text-sm text-muted-foreground hover:text-primary disabled:opacity-60"
          >
            {t.disconnect}
          </button>
        </div>
      </div>

      {editingTir && (
        <TirForm
          t={t}
          tir={tir}
          busy={tirMutation.isPending}
          failed={tirMutation.isError}
          onSave={(next) => tirMutation.mutate(next)}
          onCancel={() => setEditingTir(false)}
        />
      )}

      {latest ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">{t.last}</p>
          <p className="text-4xl font-black text-foreground">
            {latest.value_mg_dl}{" "}
            <span className="text-base font-bold text-muted-foreground">
              mg/dL
            </span>{" "}
            {latest.trend ? (
              <span aria-hidden="true">{TREND_ARROWS[latest.trend]}</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(latest.measured_at), "HH:mm")}
          </p>

          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  className="stroke-border"
                />
                {/* Zona de tiempo en rango (TIR) */}
                <ReferenceArea
                  y1={tir.low}
                  y2={tir.high}
                  fill={PRIMARY}
                  fillOpacity={0.08}
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[rangeStart, rangeEnd]}
                  ticks={hourTicks(rangeStart, rangeEnd)}
                  interval={0}
                  tickFormatter={(x: number) => format(new Date(x), "HH:mm")}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  height={20}
                />
                <YAxis
                  domain={[40, Y_MAX]}
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => [`${value} mg/dL`, t.title]}
                  labelFormatter={(x: number) => format(new Date(x), "HH:mm")}
                />
                {/* Comidas registradas: línea punteada debajo de la curva */}
                {visibleMeals.map((meal) => (
                  <ReferenceLine
                    key={`line-${meal.x}`}
                    x={meal.x}
                    stroke={MEAL_COLOR}
                    strokeOpacity={0.4}
                    strokeDasharray="3 3"
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: PRIMARY, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                {/* …y la manzana arriba, encima de todo */}
                {visibleMeals.map((meal) => (
                  <ReferenceDot
                    key={`apple-${meal.x}`}
                    x={meal.x}
                    y={Y_MAX}
                    shape={(props: { cx?: number; cy?: number }) => (
                      <MealMarker
                        cx={props.cx}
                        cy={props.cy}
                        label={`${format(new Date(meal.x), "HH:mm")} · ${meal.title || t.meal} · ${carbsLabel}: ${meal.carbs} g`}
                      />
                    )}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t.empty}</p>
      )}
    </section>
  );
}

function TirForm({
  t,
  tir,
  busy,
  failed,
  onSave,
  onCancel,
}: {
  t: Copy;
  tir: Tir;
  busy: boolean;
  failed: boolean;
  onSave: (tir: Tir) => void;
  onCancel: () => void;
}) {
  const [low, setLow] = useState(String(tir.low));
  const [high, setHigh] = useState(String(tir.high));
  const valid = isValidTir(Number(low), Number(high));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSave({ low: Number(low), high: Number(high) });
  };

  const inputClass =
    "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-md border border-border bg-background p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="tir-low"
            className="text-sm font-bold text-foreground"
          >
            {t.tirLow}
          </label>
          <input
            id="tir-low"
            type="number"
            inputMode="numeric"
            min={TIR_MIN}
            max={TIR_MAX}
            step={1}
            required
            value={low}
            onChange={(e) => setLow(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="tir-high"
            className="text-sm font-bold text-foreground"
          >
            {t.tirHigh}
          </label>
          <input
            id="tir-high"
            type="number"
            inputMode="numeric"
            min={TIR_MIN}
            max={TIR_MAX}
            step={1}
            required
            value={high}
            onChange={(e) => setHigh(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {!valid && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {t.tirInvalid}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {t.errors.internal}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !valid}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {t.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function ConnectForm({
  t,
  error,
  busy,
  onSubmit,
}: {
  t: Copy;
  error: ErrorCode | null;
  busy: boolean;
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
    setPassword(""); // no dejar la contraseña en el estado del componente
    setShowPassword(false);
  };

  return (
    <section className={CARD}>
      <h2 className="text-lg font-black text-foreground">{t.connectTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.connectHelp}</p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="libre-email"
            className="text-sm font-bold text-foreground"
          >
            {t.email}
          </label>
          <input
            id="libre-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label
            htmlFor="libre-password"
            className="text-sm font-bold text-foreground"
          >
            {t.password}
          </label>
          <div className="relative mt-1.5">
            <input
              id="libre-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-input bg-background py-2.5 pl-3 pr-10 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {t.errors[error]}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {t.connect}
        </button>
      </form>
    </section>
  );
}
