import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Download, FilePlus2, Star } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, PageHeader, Segmented, StatTile, toast, useUrlParam } from "../components/ui";
import type { Task } from "../data/demo";
import { fetchNpsStats, type NpsMonth } from "../api";
import { useClients } from "../store/clients";
import { hydrateEmployees, useEmployees } from "../store/employees";
import { displayStatus, isOverdue, useTasks } from "../store/tasks";

/* Период: считаем от сегодняшнего дня назад. Задачи без даты создания
   (старые записи) попадают только в «Всё время». */
type Period = "7d" | "30d" | "90d" | "all";
const PERIODS: { id: Period; label: string; days: number | null }[] = [
  { id: "7d", label: "7 дней", days: 7 },
  { id: "30d", label: "30 дней", days: 30 },
  { id: "90d", label: "Квартал", days: 90 },
  { id: "all", label: "Всё время", days: null },
];
const inPeriod = (iso: string | null | undefined, from: number | null) =>
  from === null || (!!iso && Date.parse(iso) >= from);

const statusColor: Record<string, string> = {
  "Новая": "bg-violet-500", "В работе": "bg-brand-500", "Выполнена": "bg-emerald-500", "Архив": "bg-slate-400",
};

export default function Analytics() {
  useEffect(() => { void hydrateEmployees(); }, []);
  const [nps, setNps] = useState<NpsMonth[]>([]);
  useEffect(() => { fetchNpsStats().then(setNps).catch(() => {}); }, []);
  const clients = useClients();
  const allTasks = useTasks();
  const employees = useEmployees();
  const [period, setPeriod] = useUrlParam<Period>("period", "30d", PERIODS.map((p) => p.id));
  const pDef = PERIODS.find((p) => p.id === period)!;
  const from = pDef.days === null ? null : Date.now() - pDef.days * 86400000;
  /* задачи, созданные в периоде, и задачи, закрытые в периоде */
  const tasks = useMemo(() => allTasks.filter((t: Task) => inPeriod(t.createdAt, from)), [allTasks, from]);
  const doneInPeriod = (t: Task) => t.status === "Выполнена" && (from === null || inPeriod(t.doneAt, from));

  const newTasks = tasks.filter((t) => t.status === "Новая").length;
  const doneTasks = allTasks.filter(doneInPeriod).length;
  const overdueTasks = allTasks.filter(isOverdue).length;
  const periodWord = pDef.days === null ? "за всё время" : `за ${pDef.label.toLowerCase()}`;

  const kpi = [
    { label: "Клиенты", value: String(clients.length), icon: Building2, hint: "на обслуживании сейчас", tone: "default" as const },
    { label: "Поступило задач", value: String(tasks.length), icon: FilePlus2, hint: `${periodWord}, из них новых — ${newTasks}`, tone: "default" as const },
    { label: "Выполнено", value: String(doneTasks), icon: CheckCircle2, hint: periodWord, tone: "default" as const },
    { label: "Просрочено", value: String(overdueTasks), icon: AlertCircle, hint: "открытых на сегодня", tone: overdueTasks ? "danger" as const : "default" as const },
  ];

  /* Список сотрудников доступен только админу: бухгалтеру берём исполнителей
     из самих задач (раньше он видел «Пока нет задач, назначенных сотрудникам»). */
  const perf = useMemo(() => (employees.length
    ? employees.filter((e) => e.active).map((e) => e.name)
    : [...new Set(allTasks.map((t) => t.assignee).filter((a) => a && a !== "не назначен" && a !== "—"))])
    .map((name) => {
      const e = { name };
      const own = allTasks.filter((t) => t.assignee === e.name);
      const done = own.filter(doneInPeriod);
      const overdue = own.filter(isOverdue).length;
      /* «в срок» = доля выполненных не позже срока (раньше вычитались открытые
         просрочки из выполненных — получалось 0–50% без смысла) */
      const withDue = done.filter((t) => t.dueDate && t.doneAt);
      const inTime = withDue.filter((t) => String(t.doneAt).slice(0, 10) <= String(t.dueDate).slice(0, 10)).length;
      const ontime = withDue.length ? Math.round((inTime / withDue.length) * 100) : -1;
      const active = own.filter((t) => t.status === "Новая" || t.status === "В работе").length;
      return { name: e.name, done: done.length, overdue, ontime, active, total: own.length };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.done - a.done), [employees, allTasks, from]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusBreakdown = useMemo(() => {
    const buckets = ["Новая", "В работе", "Выполнена", "Архив"];
    const counts = buckets.map((label) => ({ label, n: tasks.filter((t) => displayStatus(t) === label).length }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    return counts.map((c) => ({ ...c, w: Math.round((c.n / max) * 100), c: statusColor[c.label] }));
  }, [tasks]);

  /* Раньше кнопка «Экспорт» только показывала «скоро будет» — теперь отдаёт CSV для Excel */
  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["Период", pDef.label],
      [],
      ["Показатель", "Значение"],
      ...kpi.map((k) => [k.label, k.value]),
      [],
      ["Сотрудник", "В работе", "Выполнено за период", "Просрочено", "В срок, %"],
      ...perf.map((p) => [p.name, p.active, p.done, p.overdue, p.ontime >= 0 ? p.ontime : ""]),
      [],
      ["Статус", "Задач"],
      ...statusBreakdown.map((b) => [b.label, b.n]),
    ];
    const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `finpulse-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Отчёт скачан");
  };

  const fromBotCount = tasks.filter((t) => t.source === "bot").length;
  const noDate = from !== null ? allTasks.filter((t) => !t.createdAt).length : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Аналитика"
        subtitle={`Показатели команды ${periodWord} · на ${new Date().toLocaleDateString("ru-RU")}`}
        actions={<>
          <Segmented items={PERIODS.map((p) => ({ id: p.id, label: p.label }))} value={period} onChange={setPeriod} />
          <Button variant="secondary" onClick={exportCsv} icon={<Download />}>Экспорт CSV</Button>
        </>}
      />

      <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
        {kpi.map(({ label, value, icon: Icon, hint, tone }) => (
          <StatTile key={label} label={label} value={value} hint={hint} icon={<Icon />} tone={tone} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-1">
        <Card className="col-span-3 max-xl:col-span-1">
          <CardHeader title="Производительность сотрудников" subtitle={`Выполнено ${periodWord}; просрочки и «в работе» — на сегодня`} />
          {perf.length ? (
            <div className="overflow-x-auto"><table className="dt">
              <thead>
                <tr>
                  <th className="px-5">Сотрудник</th>
                  <th className="px-4 text-right">В работе</th>
                  <th className="px-4 text-right">Выполнено</th>
                  <th className="px-4 text-right">Просрочено</th>
                  <th className="px-5 text-right">В срок</th>
                </tr>
              </thead>
              <tbody>
                {perf.map((p) => (
                  <tr key={p.name}>
                    <td className="px-5 py-2.5"><span className="flex items-center gap-2.5 font-medium"><Avatar name={p.name} />{p.name}</span></td>
                    <td className="px-4 py-2.5 text-right">{p.active}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{p.done}</td>
                    <td className={`px-4 py-2.5 text-right ${p.overdue ? "font-medium text-red-600" : "text-slate-400"}`}>{p.overdue}</td>
                    <td className="px-5 py-2.5 text-right" title="Доля выполненных задач со сроком, закрытых не позже срока">{p.ontime >= 0 ? <Badge tone={p.ontime >= 90 ? "green" : p.ontime >= 70 ? "yellow" : "red"}>{p.ontime}%</Badge> : <span className="text-slate-400">нет сроков</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Пока нет задач, назначенных сотрудникам.</p>
          )}
        </Card>

        <Card className="col-span-2 max-xl:col-span-1">
          <CardHeader title="Задачи по статусам" subtitle={`Поступившие ${periodWord}`} />
          <div className="space-y-3.5 p-5">
            {statusBreakdown.map((s) => (
              <div key={s.label} className="grid grid-cols-[90px_1fr_32px] items-center gap-3 text-[13px]">
                <span className="text-slate-500">{s.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s.c}`} style={{ width: `${s.w}%` }} />
                </div>
                <span className="text-right font-semibold tabular-nums">{s.n}</span>
              </div>
            ))}
            {tasks.length > 0 && (
              <p className="border-t border-slate-100 pt-3 text-[12px] text-slate-500">{fromBotCount} из {tasks.length} задач пришли из Telegram-бота</p>
            )}
            {noDate > 0 && <p className="text-[12px] text-slate-400">{noDate} старых задач без даты создания учтены только во «Всё время»</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Удовлетворённость клиентов" subtitle="Средняя оценка 1–5 из Telegram-бота по месяцам" />
        {nps.some((m) => m.count > 0) ? (
          <div className="grid grid-cols-6 gap-3 p-5 max-sm:grid-cols-2">
            {[...nps].reverse().filter((m, i, arr) => m.count > 0 || arr.slice(0, i).some((x) => x.count > 0)).map((m) => (
              <div key={m.month} className="rounded-lg border border-slate-200 bg-white p-3.5 text-center">
                <div className="text-[11px] font-medium text-slate-400">{m.month}</div>
                <div className="mt-1 flex items-center justify-center gap-1 text-lg font-semibold">
                  {m.avg !== null ? (
                    <>
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {m.avg}
                    </>
                  ) : "—"}
                </div>
                <div className="text-[11px] text-slate-400">{m.count} оценок</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Оценок пока нет — клиенты получают запрос на оценку 1–5 в Telegram-боте после закрытия задачи.
          </p>
        )}
      </Card>
    </div>
  );
}
