import { useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Language } from "@/lib/language";
import {
  NUTRIENTS,
  nutrientAmount,
  nutrientLabels,
  nutrientUnit,
  type FoodRow,
  type Nutrient,
} from "@/lib/nutrition";

// Web version of the "Estadísticas" tab from the Flutter app
// (records/widgets/registration_frequency_calendar.dart + trend_analysis_chart.dart).

const PRIMARY = "#44bcc5";
const PARTIAL = "#fab519";
const NO_RECORD = "#e28678";

type Period = "day" | "week" | "month";

const copy = {
  es: {
    frequency: "Frecuencia de Registro",
    complete: "Registro Completo",
    partial: "Registro Parcial",
    none: "Sin Registro",
    trend: "Análisis de Tendencia",
    noData: "Todavía no hay datos",
    today: "Hoy",
    day: "Día",
    week: "Semana",
    month: "Mes",
    weekdays: ["D", "L", "M", "M", "J", "V", "S"],
    prevMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    period: "Período",
    nutrient: "Nutriente",
    loading: "Cargando…",
  },
  en: {
    frequency: "Registration Frequency",
    complete: "Complete",
    partial: "Partial",
    none: "No Record",
    trend: "Trend Analysis",
    noData: "No data yet",
    today: "Today",
    day: "Day",
    week: "Week",
    month: "Month",
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    prevMonth: "Previous month",
    nextMonth: "Next month",
    period: "Period",
    nutrient: "Nutrient",
    loading: "Loading…",
  },
  it: {
    frequency: "Frequenza di registrazione",
    complete: "Registrazione completa",
    partial: "Registrazione parziale",
    none: "Nessuna registrazione",
    trend: "Analisi della tendenza",
    noData: "Non ci sono ancora dati",
    today: "Oggi",
    day: "Giorno",
    week: "Settimana",
    month: "Mese",
    weekdays: ["D", "L", "M", "M", "G", "V", "S"],
    prevMonth: "Mese precedente",
    nextMonth: "Mese successivo",
    period: "Periodo",
    nutrient: "Nutriente",
    loading: "Caricamento…",
  },
} satisfies Record<Language, unknown>;

async function fetchFoods(
  userId: string,
  start: Date,
  end: Date,
): Promise<FoodRow[]> {
  const { data, error } = await supabase
    .from("foods")
    .select("created_at, is_manual, is_edited, foods")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  if (error) throw error;
  return data ?? [];
}

export function AccountStats({
  userId,
  language,
}: {
  userId: string;
  language: Language;
}) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(today);

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta);
    const lastDay = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    let candidate = new Date(
      next.getFullYear(),
      next.getMonth(),
      Math.min(selectedDay.getDate(), lastDay),
    );
    if (isAfter(candidate, today)) candidate = today;
    setMonth(next);
    setSelectedDay(candidate);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FrequencyCalendar
        userId={userId}
        language={language}
        month={month}
        selectedDay={selectedDay}
        onChangeMonth={changeMonth}
        onSelectDay={setSelectedDay}
      />
      <TrendChart
        userId={userId}
        language={language}
        month={month}
        selectedDay={selectedDay}
      />
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="absolute inset-0 flex items-center justify-center"
    >
      <div
        className="size-7 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Always 6 rows so the card keeps the same height across months and while loading.
const CALENDAR_CELLS = 42;

function FrequencyCalendar({
  userId,
  language,
  month,
  selectedDay,
  onChangeMonth,
  onSelectDay,
}: {
  userId: string;
  language: Language;
  month: Date;
  selectedDay: Date;
  onChangeMonth: (delta: number) => void;
  onSelectDay: (day: Date) => void;
}) {
  const t = copy[language];
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const today = startOfDay(new Date());
  const isCurrentMonth = isSameMonth(month, today);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFoods(userId, month, addMonths(month, 1))
      .then((rows) => {
        const byDay: Record<number, number> = {};
        for (const row of rows) {
          const day = new Date(row.created_at).getDate();
          byDay[day] = (byDay[day] ?? 0) + 1;
        }
        if (!cancelled) setCounts(byDay);
      })
      .catch(() => {
        if (!cancelled) setCounts({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, month]);

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = month.getDay();
  const monthLabel = new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
  }).format(month);
  const longDate = new Intl.DateTimeFormat(language, { dateStyle: "long" });

  return (
    <section className="flex h-full flex-col rounded-md border border-border bg-card p-5 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-lg font-black text-foreground">
          {t.frequency}
        </h2>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            aria-label={t.prevMonth}
            className="rounded-md p-1 text-foreground hover:bg-accent"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span
            aria-live="polite"
            className="w-28 text-center text-xs capitalize text-muted-foreground"
          >
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            disabled={isCurrentMonth}
            aria-label={t.nextMonth}
            className="rounded-md p-1 text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="mt-3 grid grid-cols-7 text-center text-xs text-muted-foreground"
      >
        {t.weekdays.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div
        role="group"
        aria-label={monthLabel}
        aria-busy={loading}
        className="mt-2 grid grid-cols-7 gap-y-2"
      >
        {Array.from({ length: CALENDAR_CELLS }, (_, i) => {
          const day = i - firstWeekday + 1;
          if (day < 1 || day > daysInMonth) {
            return (
              <span key={`empty-${i}`} aria-hidden="true" className="h-8" />
            );
          }
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          if (isAfter(date, today)) {
            return (
              <span
                key={day}
                className="flex size-8 items-center justify-center justify-self-center text-xs text-muted-foreground"
              >
                {day}
              </span>
            );
          }
          if (loading) {
            return (
              <span
                key={day}
                aria-hidden="true"
                className="size-8 animate-pulse justify-self-center rounded-full bg-muted"
              />
            );
          }
          const count = counts[day] ?? 0;
          const color = count >= 4 ? PRIMARY : count >= 1 ? PARTIAL : NO_RECORD;
          const status =
            count >= 4 ? t.complete : count >= 1 ? t.partial : t.none;
          const selected = isSameDay(date, selectedDay);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(date)}
              aria-label={`${longDate.format(date)}: ${status}`}
              aria-pressed={selected}
              style={{ backgroundColor: color }}
              className={`flex size-8 items-center justify-center justify-self-center rounded-full text-xs font-bold text-white ${selected ? "ring-2 ring-foreground ring-offset-1 ring-offset-card" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4 text-xs text-foreground">
        {[
          [PRIMARY, t.complete],
          [PARTIAL, t.partial],
          [NO_RECORD, t.none],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

type ChartData = {
  points: { x: number; y: number }[];
  minX: number;
  maxX: number;
  range: string;
  xLabel: (x: number) => string;
};

function TrendChart({
  userId,
  language,
  month,
  selectedDay,
}: {
  userId: string;
  language: Language;
  month: Date;
  selectedDay: Date;
}) {
  const t = copy[language];
  const [period, setPeriod] = useState<Period>("month");
  const [nutrient, setNutrient] = useState<Nutrient>("carbohydrates");
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = addDays(selectedDay, -6);
  const [start, end] =
    period === "month"
      ? [month, addMonths(month, 1)]
      : period === "week"
        ? [weekStart, addDays(selectedDay, 1)]
        : [selectedDay, addDays(selectedDay, 1)];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFoods(userId, start, end)
      .then((rows) => {
        if (!cancelled) setFoods(rows);
      })
      .catch(() => {
        if (!cancelled) setFoods([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, start.getTime(), end.getTime()]);

  const unit = nutrientUnit(nutrient);
  const shortDate = new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  });
  const chart = buildChart();

  function buildChart(): ChartData {
    const now = new Date();
    if (period === "day") {
      const sorted = [...foods].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
      const points: ChartData["points"] = [];
      let cumulative = 0;
      for (const food of sorted) {
        const created = new Date(food.created_at);
        const hour = created.getHours() + created.getMinutes() / 60;
        if (points.length === 0) points.push({ x: hour, y: 0 });
        cumulative += nutrientAmount(food, nutrient);
        points.push({ x: hour, y: cumulative });
      }
      const isToday = isSameDay(selectedDay, now);
      const nowHour = now.getHours() + now.getMinutes() / 60;
      const lastHour = points.at(-1)?.x;
      if (isToday && lastHour !== undefined && lastHour < nowHour)
        points.push({ x: nowHour, y: cumulative });
      const minX = points[0]?.x ?? 0;
      const maxX = points.length
        ? Math.min(24, Math.max(points.at(-1)?.x ?? minX, minX + 1))
        : 24;
      return {
        points,
        minX,
        maxX,
        range: isToday ? t.today : shortDate.format(selectedDay),
        xLabel: (x) => `${Math.round(x)}h`,
      };
    }

    if (period === "week") {
      const byIndex = Array.from({ length: 7 }, () => 0);
      const hasData = Array.from({ length: 7 }, () => false);
      for (const food of foods) {
        const index = Math.round(
          (startOfDay(new Date(food.created_at)).getTime() -
            weekStart.getTime()) /
            86_400_000,
        );
        if (index < 0 || index > 6) continue;
        byIndex[index] = (byIndex[index] ?? 0) + nutrientAmount(food, nutrient);
        hasData[index] = true;
      }
      const first = hasData.indexOf(true) === -1 ? 6 : hasData.indexOf(true);
      const points = byIndex.slice(first).map((y, i) => ({ x: first + i, y }));
      return {
        points: foods.length ? points : [],
        minX: first,
        maxX: Math.max(6, first + 1),
        range: `${shortDate.format(addDays(weekStart, first))} - ${shortDate.format(selectedDay)}`,
        xLabel: (x) => t.weekdays[addDays(weekStart, x).getDay()] ?? "",
      };
    }

    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const endDay = isSameMonth(month, now) ? now.getDate() : daysInMonth;
    const byDay: Record<number, number> = {};
    for (const food of foods) {
      const day = new Date(food.created_at).getDate();
      byDay[day] = (byDay[day] ?? 0) + nutrientAmount(food, nutrient);
    }
    const daysWithData = Object.keys(byDay)
      .map(Number)
      .filter((d) => d <= endDay);
    const startDay = daysWithData.length ? Math.min(...daysWithData) : endDay;
    const points = Array.from({ length: endDay - startDay + 1 }, (_, i) => ({
      x: startDay + i,
      y: byDay[startDay + i] ?? 0,
    }));
    return {
      points: daysWithData.length ? points : [],
      minX: startDay,
      maxX: Math.max(endDay, startDay + 1),
      range: `${shortDate.format(new Date(month.getFullYear(), month.getMonth(), startDay))} - ${endDay}`,
      xLabel: (x) => `${x}`,
    };
  }

  const maxValue = Math.max(0, ...chart.points.map((p) => p.y));
  const maxY = chart.points.length ? Math.max(50, maxValue * 1.2) : 100;

  return (
    <section className="flex h-full flex-col rounded-md border border-border bg-card p-5 shadow-lg">
      <h2 className="text-lg font-black text-foreground">{t.trend}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {nutrientLabels[language][nutrient]} ({unit}) vs. {chart.range}
      </p>

      <div
        role="group"
        aria-label={t.period}
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={`rounded-md border py-2 text-xs font-bold ${period === p ? "border-transparent text-white" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}
            style={period === p ? { backgroundColor: PRIMARY } : undefined}
          >
            {t[p]}
          </button>
        ))}
      </div>
      <select
        aria-label={t.nutrient}
        value={nutrient}
        onChange={(e) => setNutrient(e.target.value as Nutrient)}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      >
        {NUTRIENTS.map((n) => (
          <option key={n} value={n}>
            {nutrientLabels[language][n]}
          </option>
        ))}
      </select>

      <div className="relative mt-4 min-h-48 flex-1">
        {loading ? (
          <Spinner label={t.loading} />
        ) : chart.points.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {t.noData}
          </p>
        ) : (
          <>
            <table className="sr-only">
              <caption>
                {t.trend}: {nutrientLabels[language][nutrient]} ({unit}),{" "}
                {chart.range}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t[period]}</th>
                  <th scope="col">{nutrientLabels[language][nutrient]}</th>
                </tr>
              </thead>
              <tbody>
                {chart.points.map((point, i) => (
                  <tr key={i}>
                    <td>{chart.xLabel(point.x)}</td>
                    <td>{`${Math.round(point.y)}${unit}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div aria-hidden="true" className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart.points}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[chart.minX, chart.maxX]}
                    tickFormatter={chart.xLabel}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    domain={[0, maxY]}
                    tickFormatter={(v: number) => `${Math.round(v)}${unit}`}
                    width={48}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${Math.round(value)}${unit}`,
                      nutrientLabels[language][nutrient],
                    ]}
                    labelFormatter={(x: number) => chart.xLabel(x)}
                  />
                  <Area
                    type={period === "day" ? "linear" : "monotone"}
                    dataKey="y"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    fill={PRIMARY}
                    fillOpacity={0.15}
                    isAnimationActive={false}
                    dot={
                      period === "day"
                        ? false
                        : {
                            r: 3,
                            stroke: PRIMARY,
                            strokeWidth: 2,
                            fill: "var(--card)",
                          }
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
