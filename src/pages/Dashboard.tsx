import { useEffect, useMemo } from "react";
import { AreaChart } from "../components/Charts";
import {
  AlertCircle, ArrowRight, Building2, Check, CheckCircle2,
  ListTodo, Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, Card, CardHeader, PageHeader, PriorityMark, Segmented, StatTile, toast, useUrlParam } from "../components/ui";
import type { Task } from "../data/demo";
import { displayStatus, isOverdue, setTaskStatus, useTasks } from "../store/tasks";
import { useClients } from "../store/clients";
import { hydrateEmployees, useEmployees } from "../store/employees";

const donutColors: Record<string, string> = {
  "Новая": "#8b5cf6", "В работе": "#2563eb", "Выполнена": "#10b981", "Отменено": "#ef4444", "Архив": "#94a3b8",
};

function Donut({ data }: { data: { label: string; n: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.n, 0);
  const r = 54, c = 2 * Math.PI * r;
  let acc = 0;
  if (!total) {
    return (
      <svg viewBox="0 0 140 140" className="size-36 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 140 140" className="size-36 -rotate-90">
      {data.filter((d) => d.n > 0).map((d) => {
        const len = (d.n / total) * c;
        const el = (
          <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16"
            strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-acc} />
        );
        acc += len;
        return el;
      })}
    </svg>
  );
}

export default function Dashboard() {
  useEffect(() => { void hydrateEmployees(); }, []);
  const tasks = useTasks();
  const clients = useClients();
  const employees = useEmployees();

  const activeTasks = tasks.filter((t) => { const s = displayStatus(t); return s === "Новая" || s === "В работе"; });
  const doneTasks = tasks.filter((t) => t.status === "Выполнена");
  const overdueTasks = tasks.filter(isOverdue);

  /* Тренды «эта неделя к прошлой» по ISO-датам создания и выполнения */
  const DAY = 86400000, now = Date.now();
  const inRange = (iso: string | null | undefined, fromDays: number, toDays: number) => {
    if (!iso) return false; const t = Date.parse(iso); return t > now - fromDays * DAY && t <= now - toDays * DAY;
  };
  const created7 = tasks.filter((t) => inRange(t.createdAt, 7, 0)).length;
  const createdPrev = tasks.filter((t) => inRange(t.createdAt, 14, 7)).length;
  const done7 = doneTasks.filter((t) => inRange(t.doneAt, 7, 0)).length;
  const donePrev = doneTasks.filter((t) => inRange(t.doneAt, 14, 7)).length;
  const trendOf = (cur: number, prev: number, upIsGood: boolean) => {
    if (cur === prev) return { text: "0%", dir: "flat" as const };
    const dir = cur > prev ? "up" as const : "down" as const;
    /* на малых числах проценты бессмысленны (+600%) — показываем разницу в штуках */
    const text = prev < 5 ? `${cur > prev ? "+" : "−"}${Math.abs(cur - prev)}` : `${cur > prev ? "+" : "−"}${Math.round((Math.abs(cur - prev) / prev) * 100)}%`;
    return { text, dir, good: dir === "up" ? upIsGood : !upIsGood };
  };
  const pending = clients.filter((c) => c.status === "pending").length;

  const kpi = [
    { label: "Клиенты", value: String(clients.length), icon: Building2, tone: "default" as const, to: "/clients",
      footer: pending ? <>Ожидают активации: {pending}</> : <>Все активированы <Check className="text-emerald-600" /></>, hint: "компаний на обслуживании" },
    { label: "Активные задачи", value: String(activeTasks.length), icon: ListTodo, tone: "default" as const, to: "/tasks",
      trend: trendOf(created7, createdPrev, true), footer: <>Поступило за неделю: {created7}</>, hint: "новые и в работе" },
    { label: "Выполненные", value: String(doneTasks.length), icon: CheckCircle2, tone: "default" as const, to: "/tasks?view=table",
      trend: trendOf(done7, donePrev, true), footer: <>Закрыто за неделю: {done7}</>, hint: "всего выполнено" },
    { label: "Просроченные", value: String(overdueTasks.length), icon: AlertCircle, tone: overdueTasks.length ? "danger" as const : "default" as const, to: "/tasks?view=table",
      footer: overdueTasks.length ? <>Требуют внимания <AlertCircle className="text-red-500" /></> : <>Всё в срок <Check className="text-emerald-600" /></>, hint: "открытые задачи после срока" },
  ];

  /* График «Поток задач»: поступило и выполнено по дням */
  const [range, setRange] = useUrlParam<"7" | "30" | "90">("range", "30", ["7", "30", "90"]);
  const chart = useMemo(() => {
    const days = Number(range);
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    const idx = (iso?: string | null) => { if (!iso) return -1; const d = new Date(iso); d.setHours(0, 0, 0, 0); return Math.round((d.getTime() - start.getTime()) / DAY); };
    const created = Array(days).fill(0), done = Array(days).fill(0);
    for (const t of tasks) {
      const i = idx(t.createdAt); if (i >= 0 && i < days) created[i]++;
      const j = t.status === "Выполнена" ? idx(t.doneAt) : -1; if (j >= 0 && j < days) done[j]++;
    }
    const labels = Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * DAY).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""));
    return { labels, created, done, sumC: created.reduce((a, b) => a + b, 0), sumD: done.reduce((a, b) => a + b, 0) };
  }, [tasks, range]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Выполненные сегодня задачи остаются в списке (зачёркнутые, внизу) до конца
     дня — и пропадают из «на сегодня» только на следующий день, когда их
     doneAt больше не совпадает с текущей календарной датой. */
  const isDoneToday = (t: Task) => {
    if (!t.doneAt) return false;
    const d = new Date(t.doneAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  /* «Ближайшие задачи»: сначала просроченные, потом по сроку (без срока — в конце),
     выполненные сегодня — зачёркнутыми внизу. Раньше блок назывался «на сегодня»,
     но срок не учитывал вовсе (UX-аудит 23.11.2026). */
  const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const rank = (t: Task) => (t.status === "Выполнена" ? 3 : isOverdue(t) ? 0 : t.dueDate ? 1 : 2);
  const today = tasks
    .filter((t) => {
      const s = displayStatus(t);
      if (s === "Архив" || s === "Отменено") return false;
      if (s === "Выполнена") return isDoneToday(t);
      return true;
    })
    .sort((a, b) => rank(a) - rank(b) || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")))
    .slice(0, 6);
  const dueLabel = (t: Task) => {
    if (t.status === "Выполнена") return { text: "сделано", cls: "text-emerald-600" };
    if (isOverdue(t)) return { text: `просрочено · ${t.due}`, cls: "font-medium text-red-600" };
    if (t.dueDate && t.dueDate.slice(0, 10) === todayIso) return { text: "сегодня", cls: "font-medium text-amber-600" };
    return { text: t.dueDate ? `до ${t.due}` : "без срока", cls: "text-slate-400" };
  };

  const donutData = ["Новая", "В работе", "Выполнена", "Отменено", "Архив"].map((label) => ({
    label,
    n: tasks.filter((t) => displayStatus(t) === label).length,
    color: donutColors[label],
  }));
  const donutTotal = donutData.reduce((s, d) => s + d.n, 0);

  /* Список сотрудников отдаётся только админу. Бухгалтеру раньше показывалось
     «Активных сотрудников пока нет», хотя задачи назначены, — берём имена из задач. */
  const names = employees.length
    ? employees.filter((e) => e.active).map((e) => e.name)
    : [...new Set(tasks.map((t) => t.assignee).filter((a) => a && a !== "не назначен" && a !== "—"))];
  const loadByEmployee = names.map((name) => ({
    name,
    n: tasks.filter((t) => t.assignee === name && (t.status === "Новая" || t.status === "В работе")).length,
  }));
  const maxLoad = Math.max(1, ...loadByEmployee.map((e) => e.n));
  const avgLoad = loadByEmployee.length ? loadByEmployee.reduce((a, e) => a + e.n, 0) / loadByEmployee.length : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Дашборд" subtitle="Что горит сегодня и как загружена команда" />

      <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpi.map(({ label, value, icon: Icon, tone, to, hint, footer, ...k }) => (
          <StatTile key={label} label={label} value={value} hint={hint} icon={<Icon />} tone={tone} to={to} footer={footer} trend={"trend" in k ? k.trend : undefined} />
        ))}
      </div>

      <Card>
        <CardHeader title="Поток задач" subtitle={`Поступило ${chart.sumC} · выполнено ${chart.sumD} за ${range} дней`}
          action={<Segmented size="sm" value={range} onChange={setRange} items={[{ id: "7", label: "7 дней" }, { id: "30", label: "30 дней" }, { id: "90", label: "3 месяца" }]} />} />
        <div className="px-5 pt-4 pb-3">
          <AreaChart labels={chart.labels} series={[
            { key: "created", label: "Поступило", color: "#2b5ce6", values: chart.created },
            { key: "done", label: "Выполнено", color: "#10b981", values: chart.done },
          ]} />
          <div className="mt-3 flex items-center gap-4 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand-600" />Поступило</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-500" />Выполнено</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-1">
        <div className="col-span-3 space-y-4 max-xl:col-span-1">
          <Card>
            <CardHeader title="Ближайшие задачи" action={
              <Link to="/tasks" className="flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                Все задачи <ArrowRight className="size-3.5" />
              </Link>
            } />
            {today.length ? (
              <div className="divide-y divide-slate-100">
                {today.map((t) => {
                  const done = t.status === "Выполнена";
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 ${done ? "opacity-50" : ""}`}>
                      <input type="checkbox" className="size-4 accent-brand-600" checked={done}
                        onChange={() => {
                          if (done) { setTaskStatus(t.id, "В работе"); }
                          else { setTaskStatus(t.id, "Выполнена"); toast("Задача отмечена выполненной"); }
                        }} />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[13px] font-medium ${done ? "text-slate-400 line-through" : ""}`}>{t.title}</div>
                        <div className="text-xs text-slate-400">{t.client} · {t.assignee}</div>
                      </div>
                      {t.fromBot && <Send className="size-3.5 shrink-0 text-cyan-500 max-sm:hidden" />}
                      {(t.priority === "Высокий" || t.priority === "Критический") && <span className="max-sm:hidden"><PriorityMark value={t.priority} /></span>}
                      <span className={`text-xs whitespace-nowrap ${dueLabel(t).cls}`}>{dueLabel(t).text}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Нет открытых задач — можно перевести дух.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Загрузка команды" action={employees.length ? (
              <Link to="/employees" className="flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
                Сотрудники <ArrowRight className="size-3.5" />
              </Link>
            ) : undefined} />
            {loadByEmployee.length ? (
              <div className="space-y-4 p-5">
                {loadByEmployee.map(({ name, n }) => {
                  const pct = Math.round((n / maxLoad) * 100);
                  /* перегруз — заметно выше среднего по команде, а не просто «самый загруженный» */
                  const heavy = n >= 4 && n > 1.5 * avgLoad;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex justify-between text-[13px]">
                          <span className="font-medium">{name}</span>
                          <span className="text-slate-500 tabular-nums">{n} {n % 10 === 1 && n % 100 !== 11 ? "задача" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "задачи" : "задач"}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${heavy ? "bg-amber-500" : "bg-brand-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Активных задач с исполнителем пока нет.</p>
            )}
          </Card>
        </div>

        <div className="col-span-2 space-y-4 max-xl:col-span-1">
          <Card>
            <CardHeader title="Статусы задач" />
            <div className="flex items-center gap-6 p-5">
              <div className="relative">
                <Donut data={donutData} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold">{donutTotal}</span>
                  <span className="text-[10px] text-slate-400">всего задач</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2.5 text-[13px]">
                {donutData.map((d) => (
                  <li key={d.label} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
                    {d.label}
                    <span className="ml-auto font-semibold text-slate-500">{d.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="Недавно выполнено" />
            {doneTasks.length ? (
              <div className="space-y-4 p-5">
                {doneTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] leading-snug"><b className="font-semibold">{t.assignee}</b> выполнил «{t.title}»</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{t.client}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Пока нет выполненных задач.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
