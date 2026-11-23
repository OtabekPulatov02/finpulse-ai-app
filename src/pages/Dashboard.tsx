import { useEffect } from "react";
import {
  AlertCircle, ArrowRight, Building2, Check, CheckCircle2,
  ListTodo, Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, Badge, Card, CardHeader, PageHeader, toast } from "../components/ui";
import { priorityTone, type Task } from "../data/demo";
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

  const kpi = [
    { label: "Клиенты", value: String(clients.length), icon: Building2, tone: "text-brand-600 bg-brand-50", to: "/clients" },
    { label: "Активные задачи", value: String(activeTasks.length), icon: ListTodo, tone: "text-violet-600 bg-violet-50", to: "/tasks" },
    { label: "Выполненные", value: String(doneTasks.length), icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50", to: "/tasks?view=table" },
    { label: "Просроченные", value: String(overdueTasks.length), icon: AlertCircle, tone: "text-red-600 bg-red-50", to: "/tasks?view=table" },
  ];

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

  return (
    <div className="space-y-5">
      <PageHeader title="Дашборд" subtitle="Что горит сегодня и как загружена команда" />

      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        {kpi.map(({ label, value, icon: Icon, tone, to }) => (
          <Link key={label} to={to} className="rounded-xl transition hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:ring-brand-200 focus:outline-none">
          <Card className="h-full p-5">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-medium text-slate-500">{label}</span>
              <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="size-[18px]" />
              </span>
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          </Card>
          </Link>
        ))}
      </div>

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
                        <div className={`truncate text-[13.5px] font-medium ${done ? "text-slate-400 line-through" : ""}`}>{t.title}</div>
                        <div className="text-xs text-slate-400">{t.client} · {t.assignee}</div>
                      </div>
                      {t.fromBot && <Send className="size-3.5 shrink-0 text-cyan-500 max-sm:hidden" />}
                      <span className="max-sm:hidden"><Badge tone={priorityTone[t.priority]}>{t.priority}</Badge></span>
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
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex justify-between text-[13px]">
                          <span className="font-medium">{name}</span>
                          <span className="font-semibold text-slate-500">{n} {n === 1 ? "задача" : "задачи"}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${pct > 85 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-brand-500"}`}
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
                  <span className="text-2xl font-bold">{donutTotal}</span>
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
