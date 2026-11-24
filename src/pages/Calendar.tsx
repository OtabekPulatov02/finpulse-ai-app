import { useEffect, useMemo, useState } from "react";
import { AlarmClockPlus, ChevronLeft, ChevronRight, CreditCard, ExternalLink, FileStack, ListTodo, Plus, Receipt, Repeat, Send, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardHeader, ConfirmModal, FilterChips, Modal, PageHeader, toast } from "../components/ui";
import { useTasks } from "../store/tasks";
import { hydrateClients, useClients } from "../store/clients";
import { createCalendarEvent, hydrateCalendarEvents, removeCalendarEvent, useCalendarEvents } from "../store/calendarEvents";
import type { CalendarEventEntry } from "../api";
import { fetch1cReports, fetchDicts, type Dicts } from "../api";
import { formatSumsInText } from "../lib/amount";

type EvType = "tax" | "pay" | "task" | "report";
interface Ev {
  key: string; date: Date; type: EvType; title: string; company: string;
  repeat: string; remindDays: number | null; id?: string; taskNum?: number;
}

const MONTHS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_G = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DOW = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const DOW_FULL = ["понедельник","вторник","среда","четверг","пятница","суббота","воскресенье"];

const pill: Record<EvType, string> = {
  tax: "bg-violet-50 text-violet-600 border-l-violet-500",
  pay: "bg-brand-50 text-brand-600 border-l-brand-500",
  task: "bg-amber-50 text-amber-600 border-l-amber-500",
  report: "bg-teal-50 text-teal-600 border-l-teal-500",
};
const typeIcon: Record<EvType, typeof Receipt> = { tax: Receipt, pay: CreditCard, task: ListTodo, report: FileStack };
const typeIconBg: Record<EvType, string> = {
  tax: "bg-violet-50 text-violet-600", pay: "bg-brand-50 text-brand-600", task: "bg-amber-50 text-amber-600", report: "bg-teal-50 text-teal-600",
};
const typeName: Record<EvType, string> = { tax: "Налог / отчёт", pay: "Платёж", task: "Задача", report: "Отчётность 1С (ожид. период)" };

const REPEAT_LABEL: Record<CalendarEventEntry["repeat"], string> = {
  once: "Однократно", monthly: "Ежемесячно", quarterly: "Ежеквартально", yearly: "Ежегодно",
};
const REPEAT_VALUE: Record<string, CalendarEventEntry["repeat"]> = {
  "Однократно": "once", "Ежемесячно": "monthly", "Ежеквартально": "quarterly", "Ежегодно": "yearly",
};
const REMIND_VALUE: Record<string, number> = {
  "в день события": 0, "за 1 день": 1, "за 3 дня": 3, "за неделю": 7,
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = (d: Date) => `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
const parseISODate = (s: string) => new Date(s + "T00:00:00");

export default function Calendar() {
  const navigate = useNavigate();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const tasks = useTasks();
  const clients = useClients();
  const calendarEvents = useCalendarEvents();
  useEffect(() => { void hydrateClients(); void hydrateCalendarEvents(); }, []);

  // Отчётность 1С (Document_РегламентированныйОтчет по всем синканным базам) —
  // "ожидаемый период" выведен из истории/периодичности, не официальный срок
  // сдачи (см. note ниже), но по просьбе — теперь виден прямо в календаре.
  const [reports1c, setReports1c] = useState<{ key: string; date: Date; title: string; company: string; skipped: number }[]>([]);
  useEffect(() => {
    fetch1cReports().then((r) => {
      if (!r.ok) return;
      setReports1c((r.items ?? []).map((it, i) => ({
        key: `1c:${it.appCode}:${it.name}:${i}`,
        date: parseISODate(it.nextExpectedPeriodEnd),
        title: `${it.name} (${it.appName})`,
        company: it.appName,
        skipped: it.periodsSkipped,
      })));
    }).catch(() => {});
  }, []);

  const events: Ev[] = useMemo(() => {
    const fromTasks: Ev[] = tasks
      .filter((t) => t.dueDate && t.status !== "Выполнена" && t.status !== "Отменено")
      .map((t) => ({
        key: "task:" + t.id, date: parseISODate(t.dueDate!), type: "task" as const,
        title: t.title, company: t.client, repeat: "", remindDays: null, taskNum: t.id,
      }));
    const fromEvents: Ev[] = calendarEvents
      .filter((e) => e.active)
      .map((e) => ({
        key: "ce:" + e.id, date: parseISODate(e.date), type: e.type,
        title: e.title, company: e.company || "Все клиенты",
        repeat: REPEAT_LABEL[e.repeat], remindDays: e.remindDays, id: e.id,
      }));
    const fromReports: Ev[] = reports1c.map((r) => ({
      key: r.key, date: r.date, type: "report" as const,
      title: r.title, company: r.company, repeat: "", remindDays: null,
    }));
    return [...fromTasks, ...fromEvents, ...fromReports];
  }, [tasks, calendarEvents, reports1c]);

  const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<"all" | EvType>("all");
  const [day, setDay] = useState<Date | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deleteEv, setDeleteEv] = useState<Ev | null>(null);

  const visible = (e: Ev) => filter === "all" || e.type === filter;
  const eventsOn = (d: Date) => events.filter((e) => sameDay(e.date, d) && visible(e));
  const daysDiff = (d: Date) => Math.round((d.getTime() - today.getTime()) / 86400000);

  const cells = useMemo(() => {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [cur]);

  const upcoming = events
    .filter((e) => { const dd = daysDiff(e.date); return dd >= 0 && dd <= 14 && visible(e); })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 7);

  /* Форма напоминания */
  const [nType, setNType] = useState<"tax" | "pay">("pay");
  const [nTitle, setNTitle] = useState("");
  const [nCompany, setNCompany] = useState("Все клиенты");
  const [nDate, setNDate] = useState(() => {
    const d = new Date(today); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [nRepeat, setNRepeat] = useState("Ежемесячно");
  const [nRemind, setNRemind] = useState("за 3 дня");
  const [nCount, setNCount] = useState(""); // сколько раз материализовать вперёд; пусто = бессрочно (старое поведение)
  const [saving, setSaving] = useState(false);
  const [dicts, setDicts] = useState<Dicts | null>(null);
  useEffect(() => { fetchDicts().then(setDicts).catch(() => setDicts(null)); }, []);
  const suggests = nType === "pay"
    ? (dicts?.paymentCategories?.length ? dicts.paymentCategories : ["Аренда офиса", "Интернет и связь", "Коммунальные", "Лизинг", "Страховка"])
    : (dicts?.taxCategories?.length ? dicts.taxCategories : ["Оплата НДС", "Аванс по УСН", "НДФЛ и соцвзносы", "Отчёт в статистику"]);
  const reminderTypeLabels = dicts?.reminderTypeLabels ?? { tax: "Налог / отчёт", pay: "Платёж фирмы" };
  const companyOptions = ["Все клиенты", ...clients.map((c) => c.company)];

  /* Прибавляет один период повтора к дате — используется при материализации
     нескольких конкретных occurrences сразу (см. ниже), той же логикой,
     что и сервер применяет при само-продвижении напоминания в cron/reminders.js. */
  const addPeriod = (d: Date, repeat: CalendarEventEntry["repeat"]) => {
    const next = new Date(d);
    if (repeat === "monthly") next.setMonth(next.getMonth() + 1);
    else if (repeat === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (repeat === "yearly") next.setFullYear(next.getFullYear() + 1);
    return next;
  };

  const createReminder = async () => {
    if (!nTitle.trim()) { toast("Укажите название напоминания"); return; }
    setSaving(true);
    const repeatVal = REPEAT_VALUE[nRepeat];
    const count = repeatVal !== "once" ? Math.max(0, Math.min(60, Number(nCount) || 0)) : 0;
    const company = nCompany === "Все клиенты" ? null : nCompany;

    let ok = true; let lastError: string | undefined;
    if (count > 1) {
      /* Материализуем count конкретных occurrences сразу — каждая как
         отдельное событие repeat:"once", чтобы календарь реально показывал
         все будущие даты, а не только одну самопродвигающуюся запись. */
      let d = parseISODate(nDate);
      for (let i = 0; i < count; i++) {
        const dateStr = d.toISOString().slice(0, 10);
        const r = await createCalendarEvent({ type: nType, title: nTitle.trim(), company, date: dateStr, repeat: "once", remindDays: REMIND_VALUE[nRemind] });
        if (!r.ok) { ok = false; lastError = r.error; break; }
        d = addPeriod(d, repeatVal);
      }
    } else {
      const r = await createCalendarEvent({ type: nType, title: nTitle.trim(), company, date: nDate, repeat: repeatVal, remindDays: REMIND_VALUE[nRemind] });
      ok = r.ok; lastError = r.error;
    }

    setSaving(false);
    if (!ok) { toast(lastError || "Не удалось создать напоминание"); return; }
    setCur(new Date(parseISODate(nDate).getFullYear(), parseISODate(nDate).getMonth(), 1));
    setShowNew(false); setNTitle(""); setNCount("");
    toast(count > 1 ? `Создано ${count} напоминаний · бот напомнит ${nRemind} перед каждым` : `Напоминание создано · бот напомнит ${nRemind}`);
  };

  const inp = "w-full rounded-lg border px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Календарь"
        subtitle="Отчёты, налоги и платежи фирм — бот напомнит о сроке в группе"
        actions={<Button onClick={() => setShowNew(true)} icon={<AlarmClockPlus className="size-4" />}>Новое напоминание</Button>}
      />

      <div className="grid grid-cols-[1fr_320px] items-start gap-4 max-xl:grid-cols-1">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center">
              <Button size="sm" variant="secondary" aria-label="Предыдущий месяц" className="rounded-r-none" icon={<ChevronLeft />} onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))} />
              <Button size="sm" variant="secondary" className="-ml-px rounded-none" onClick={() => setCur(new Date(today.getFullYear(), today.getMonth(), 1))}>Сегодня</Button>
              <Button size="sm" variant="secondary" aria-label="Следующий месяц" className="-ml-px rounded-l-none" icon={<ChevronRight />} onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))} />
            </div>
            <div className="min-w-32 px-2 text-[15px] font-semibold capitalize">{MONTHS[cur.getMonth()]} {cur.getFullYear()}</div>
            <div className="ml-auto">
              <FilterChips value={filter} onChange={setFilter}
                items={([["all", "Все"], ["tax", "Налоги"], ["pay", "Платежи"], ["task", "Задачи"], ["report", "Отчётность 1С"]] as const).map(([id, label]) => ({ id, label }))} />
            </div>
          </div>
          <div className="grid grid-cols-7">
            {DOW.map((d, i) => (
              <div key={d} className={`border-b border-slate-200 bg-slate-50 py-2 text-center text-[11px] font-semibold tracking-wider uppercase ${i > 4 ? "text-slate-400" : "text-slate-500"}`}>{d}</div>
            ))}
            {cells.map((d, i) => {
              const evs = eventsOn(d);
              const isToday = sameDay(d, today);
              const other = d.getMonth() !== cur.getMonth();
              return (
                <button key={i} onClick={() => setDay(d)}
                  className={`flex min-h-24 flex-col gap-0.5 border-r border-b border-slate-100 p-1.5 text-left transition hover:bg-slate-50 ${other ? "bg-slate-50/70 [&>*]:opacity-50" : ""}`}>
                  <span className={`flex size-6 items-center justify-center rounded-md text-[12px] font-medium tabular-nums ${isToday ? "bg-brand-600 text-white" : "text-slate-600"}`}>{d.getDate()}</span>
                  {/* название целиком в 2 строки + подсказка при наведении; на телефоне — цветные точки */}
                  {evs.slice(0, 2).map((e) => (
                    <span key={e.key} title={e.title}
                      className={`line-clamp-2 rounded border-l-2 px-1.5 py-0.5 text-[11px] leading-tight font-medium break-words max-md:hidden ${pill[e.type]}`}>{e.title}</span>
                  ))}
                  {evs.length > 2 && <span className="px-1.5 text-[11px] font-medium text-slate-500 max-md:hidden">+ ещё {evs.length - 2}</span>}
                  {!!evs.length && (
                    <span className="flex flex-wrap gap-1 px-1 md:hidden">
                      {evs.slice(0, 4).map((e) => <span key={e.key} className={`size-2 rounded-full border-l-0 ${pill[e.type].split(" ")[0].replace("-50", "-500")}`} />)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Ближайшие сроки" subtitle="На 14 дней вперёд" />
          <div className="divide-y divide-slate-100">
            {upcoming.map((e) => {
              const dd = daysDiff(e.date);
              const Icon = typeIcon[e.type];
              return (
                <div key={e.key} className="flex items-start gap-3 px-4 py-3">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white ${typeIconBg[e.type].split(" ").filter((c) => c.startsWith("text-")).join(" ")}`}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13px] leading-snug font-medium text-slate-900">{e.title}</div>
                    <div className="mt-0.5 text-[12px] text-slate-500">{e.company} · {fmt(e.date)}{e.repeat && <> · <Repeat className="inline size-3 align-[-1px]" /> {e.repeat.toLowerCase()}</>}</div>
                    {e.remindDays !== null && (
                      <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500"><Send className="size-3 text-slate-400" />бот уведомит за {e.remindDays} дн.</div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded px-1.5 text-[11px] leading-5 font-medium whitespace-nowrap ${dd === 0 ? "bg-red-50 text-red-700" : dd <= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {dd === 0 ? "сегодня" : dd === 1 ? "завтра" : `через ${dd} дн.`}
                  </span>
                </div>
              );
            })}
            {!upcoming.length && <div className="p-8 text-center text-sm text-slate-400">В ближайшие две недели сроков нет</div>}
          </div>
        </Card>
      </div>

      {/* Модалка: события дня */}
      <Modal open={!!day} onClose={() => setDay(null)}
        title={day ? `${fmt(day)}, ${DOW_FULL[(day.getDay() + 6) % 7]}` : ""}
        footer={<button onClick={() => { setDay(null); if (day) setNDate(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`); setShowNew(true); }}
          className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-700/20 bg-brand-600 px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-4" /> Добавить на этот день
        </button>}>
        {day && (
          <div className="divide-y divide-slate-100">
            {eventsOn(day).map((e) => {
              const Icon = typeIcon[e.type];
              return (
                <div key={e.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white ${typeIconBg[e.type].split(" ").filter((c) => c.startsWith("text-")).join(" ")}`}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{e.title}</div>
                    <div className="text-xs text-slate-400">{typeName[e.type]} · {e.company}{e.repeat && <> · <Repeat className="inline size-3 align-[-1px]" /> {e.repeat.toLowerCase()}</>}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {e.type === "task" ? (
                      <button onClick={() => { setDay(null); navigate(`/tasks?open=${e.taskNum}`); }}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <ExternalLink className="size-3.5" />Открыть задачу
                      </button>
                    ) : e.type === "report" ? (
                      <button onClick={() => { setDay(null); navigate("/settings/1c"); }}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <ExternalLink className="size-3.5" />В разделе «1С»
                      </button>
                    ) : (
                      <button onClick={() => setDeleteEv(e)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                        <Trash2 className="size-3.5" />Удалить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!eventsOn(day).length && <div className="py-8 text-center text-sm text-slate-400">На этот день ничего нет</div>}
          </div>
        )}
      </Modal>

      {/* Модалка: новое напоминание */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Новое напоминание"
        footer={<>
          <button onClick={() => setShowNew(false)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3.5 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Отмена</button>
          <button disabled={saving} onClick={createReminder} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-700/20 bg-brand-600 px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Создаём…" : "Создать"}
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">Тип напоминания</label>
            <select value={nType} onChange={(e) => setNType(e.target.value as "tax" | "pay")} className={inp}>
              <option value="tax">🧾 {reminderTypeLabels.tax}</option>
              <option value="pay">💳 {reminderTypeLabels.pay}</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">Что напомнить <span className="text-red-500">*</span></label>
            <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} onBlur={() => setNTitle((v) => formatSumsInText(v))} placeholder="Аренда офиса — 12 000 000 сум" className={inp} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggests.map((s) => (
                <button key={s} onClick={() => setNTitle(s)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-brand-50 hover:text-brand-600">{s}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">Компания</label>
              <select value={nCompany} onChange={(e) => setNCompany(e.target.value)} className={inp}>
                {companyOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">Дата <span className="text-red-500">*</span></label>
              <input type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">Повтор</label>
              <select value={nRepeat} onChange={(e) => setNRepeat(e.target.value)} className={inp}>
                {Object.keys(REPEAT_VALUE).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">Напомнить</label>
              <select value={nRemind} onChange={(e) => setNRemind(e.target.value)} className={inp}>
                {Object.keys(REMIND_VALUE).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {nRepeat !== "Однократно" && (
              <div className="col-span-2">
                <label className="mb-1.5 block text-[13px] font-medium">Сколько повторов показать в календаре</label>
                <input value={nCount} onChange={(e) => setNCount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Например, 12" className={inp} />
                <p className="mt-1.5 text-xs text-slate-400">Например, 12 при «Ежемесячно» — даты на год вперёд. Пусто — одно напоминание, которое само переносится на следующую дату.</p>
              </div>
            )}
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-400"><Send className="size-3.5" />Бот напомнит в Telegram-группе при приближении срока.</p>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteEv} onClose={() => setDeleteEv(null)}
        title="Удалить напоминание?"
        text={deleteEv ? `«${deleteEv.title}» больше не будет напоминаться.` : ""}
        confirmLabel="Удалить"
        onConfirm={() => {
          if (!deleteEv?.id) return;
          const id = deleteEv.id;
          void removeCalendarEvent(id).then((r) => {
            if (r.ok) toast("Напоминание удалено"); else toast(r.error || "Не удалось удалить");
          });
          setDay(null);
        }}
      />
    </div>
  );
}
