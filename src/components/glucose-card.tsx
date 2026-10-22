import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Language } from "@/lib/language";
import { connectLibre, disconnectLibre, readLibre } from "@/lib/libre";

const PRIMARY = "#44bcc5";

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
  disconnect: string;
  loading: string;
  empty: string;
  last: string;
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
    disconnect: "Desconectar",
    loading: "Cargando…",
    empty: "Todavía no hay mediciones.",
    last: "Última medición",
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
    disconnect: "Disconnect",
    loading: "Loading…",
    empty: "No readings yet.",
    last: "Latest reading",
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
    disconnect: "Scollega",
    loading: "Caricamento…",
    empty: "Ancora nessuna misurazione.",
    last: "Ultima misurazione",
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
function hourTicks(points: { x: number }[]): number[] {
  if (points.length === 0) return [];
  const min = points[0]!.x;
  const max = points[points.length - 1]!.x;
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

export function GlucoseCard({ language }: { language: Language }) {
  const t: Copy = copy[language];
  const queryClient = useQueryClient();
  const read = useServerFn(readLibre);
  const connect = useServerFn(connectLibre);
  const disconnect = useServerFn(disconnectLibre);

  // Al montar y cada 60 s; el servidor igual no consulta a LibreLinkUp más de una vez por minuto
  const { data, isLoading } = useQuery({
    queryKey: ["libre-readings"],
    queryFn: () => read(),
    refetchInterval: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      connect({ data: vars }),
    onSuccess: (result) => {
      if (result.ok)
        queryClient.invalidateQueries({ queryKey: ["libre-readings"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["libre-readings"] }),
  });

  if (isLoading || !data) {
    return (
      <section className={CARD}>
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </section>
    );
  }

  const connected = data.ok && data.data.connected;

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
  console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  console.log(data.data.readings);
  // Vienen de la más nueva a la más vieja
  const readings = data.data.readings;
  const latest = readings[0];
  const chartData = toFifteenMinutePoints(readings);

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-lg font-black text-foreground">
          {t.title}
        </h2>
        <button
          type="button"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="shrink-0 text-sm text-muted-foreground hover:text-primary disabled:opacity-60"
        >
          {t.disconnect}
        </button>
      </div>

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
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  className="stroke-border"
                />
                {/* Rango objetivo 70–180 mg/dL */}
                <ReferenceArea
                  y1={70}
                  y2={180}
                  fill={PRIMARY}
                  fillOpacity={0.08}
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={hourTicks(chartData)}
                  interval={0}
                  tickFormatter={(x: number) => format(new Date(x), "HH:mm")}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  height={20}
                />
                <YAxis
                  domain={[40, 300]}
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
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: PRIMARY, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
    setPassword(""); // no dejar la contraseña en el estado del componente
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
          <input
            id="libre-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
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
