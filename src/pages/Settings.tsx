import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from "lucide-react";
import { Badge, Card, CardHeader, FilterChips, SaveButton, Toggle, toast, useDirty, type Tone } from "../components/ui";
import { fetchAssignRules, fetchBotSettings, fetchLogs, fetchLogsArchive, fetchNotifSettings, saveAssignRules, saveBotSettings, saveNotifSettings, type AssignRule, type BotSettings, type NotifSettings } from "../api";
import { mapLog, type LogView } from "../lib/logs";
import { useEmployees } from "../store/employees";



export function NotifTab() {
  const [set, setSet] = useState<NotifSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchNotifSettings().then(setSet).catch(() => setSet({
      taskAssigned: true, clientMessage: true, dueSoon: true, overdue: true, weeklyDigest: false,
    }));
  }, []);
  if (!set) return <Card><div className="p-8 text-center text-sm text-slate-400">Загрузка настроек уведомлений…</div></Card>;

  const items: { key: keyof NotifSettings; title: string; desc: string }[] = [
    { key: "taskAssigned", title: "Новая задача назначена мне", desc: "личное сообщение клиенту, что задача взята в работу" },
    { key: "clientMessage", title: "Обращение клиента из Telegram", desc: "отдельный заголовок «Клиент по задаче №N» в группе (сама переписка идёт в ленту чата в любом случае)" },
    { key: "dueSoon", title: "Приближается дедлайн", desc: "напоминание в группу и клиенту в день срока" },
    { key: "overdue", title: "Задача просрочена", desc: "раздел «Просрочено» в ежедневном дайджесте группы" },
    { key: "weeklyDigest", title: "Еженедельная сводка", desc: "по понедельникам — счётчики задач по статусам и просрочки" },
  ];

  const toggle = async (key: keyof NotifSettings) => {
    const next = { ...set, [key]: !set[key] };
    setSet(next);
    setSaving(true);
    try {
      const r = await saveNotifSettings(next);
      if (!r.ok) { toast(r.error || "Не удалось сохранить"); setSet(set); }
    } catch { toast("Не удалось сохранить"); setSet(set); }
    finally { setSaving(false); }
  };

  return (
    <Card className="divide-y divide-slate-100">
      {items.map((i) => (
        <div key={i.key} className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[13px] font-medium">{i.title}</div>
            <div className="text-xs text-slate-400">{i.desc}</div>
          </div>
          <Toggle checked={set[i.key]} onChange={() => !saving && toggle(i.key)} />
        </div>
      ))}
    </Card>
  );
}


export function BotTab() {
  const [set, setSet] = useState<BotSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const { dirty, markSaved } = useDirty(set);
  useEffect(() => {
    fetchBotSettings().then(setSet).catch(() => setSet({ slaHours: 3, workStart: 9, workEnd: 16, tzOffset: 5 }));
  }, []);
  if (!set) return <Card><div className="p-8 text-center text-sm text-slate-400">Загрузка настроек бота…</div></Card>;

  const saveAll = async () => {
    setSaving(true);
    try {
      const r1 = await saveBotSettings(set);
      if (r1.ok) { markSaved(); toast("Настройки бота сохранены — применяются сразу"); }
      else toast(r1.error || "Не удалось сохранить");
    } finally { setSaving(false); }
  };
  const numInput = "w-20 rounded-lg border px-2.5 py-1.5 text-center focus:border-brand-500 focus:outline-none text-[13px] border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100";

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-3 gap-6 p-5 text-[13px] max-md:grid-cols-1">
          <div>
            <div className="mb-1.5 font-medium">Приём заявок, часы (Ташкент)</div>
            <div className="flex items-center gap-2">
              <input className={numInput} value={set.workStart} onChange={(e) => setSet({ ...set, workStart: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
              <span className="text-slate-400">—</span>
              <input className={numInput} value={set.workEnd} onChange={(e) => setSet({ ...set, workEnd: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Вне окна бот предложит «на завтра» или отмену</p>
          </div>
          <div>
            <div className="mb-1.5 font-medium">SLA, часов</div>
            <input className={numInput} value={set.slaHours} onChange={(e) => setSet({ ...set, slaHours: Number(e.target.value.replace(/\D/g, "")) || 1 })} />
            <p className="mt-1.5 text-xs text-slate-400">«⏱ Проведём вашу операцию в течение N ч.» после приёма заявки</p>
          </div>
          <div>
            <div className="mb-1.5 font-medium">Доверенные лица</div>
            <p className="text-xs leading-relaxed text-slate-400">Заявки отправляет владелец номера из карточки клиента или первый зарегистрированный. Остальные — после подтверждения (Telegram или блок «Заявки на доступ» в Клиентах).</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-400"><Link2 className="size-3.5" />Услуги в меню бота и должности клиентов — <a href="#services" className="font-medium text-brand-600 hover:underline">ниже на этой странице</a></span>
          <SaveButton dirty={dirty} saving={saving} onClick={() => void saveAll()} />
        </div>
      </Card>
    </div>
  );
}

const PRIORITY_OPTIONS = ["Низкий", "Средний", "Высокий", "Критический"];
const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
const rsel = "rounded-lg border px-2.5 py-1.5 text-[13px] text-slate-800 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100";

export function RulesTab() {
  const [rules, setRules] = useState<AssignRule[] | null>(null);
  const [saving, setSaving] = useState(false);
  const employees = useEmployees();
  const { dirty, markSaved } = useDirty(rules);
  useEffect(() => { fetchAssignRules().then(setRules).catch(() => setRules([])); }, []);

  const upd = (i: number, patch: Partial<AssignRule>) =>
    setRules((r) => r!.map((x, xi) => xi === i ? { ...x, ...patch } : x));
  const move = (i: number, d: -1 | 1) => setRules((r) => {
    const next = [...r!]; const [x] = next.splice(i, 1); next.splice(i + d, 0, x); return next;
  });
  /* «Проверить»: та же логика, что matchRule в lib/assign.js на сервере */
  const [probe, setProbe] = useState("");
  const [probeSrc, setProbeSrc] = useState<"telegram" | "crm">("telegram");
  const hit = probe.trim() && rules ? rules.find((r) => r.enabled && (r.source === "any" || r.source === probeSrc)
    && (!r.keywords.length || r.keywords.some((k) => k && probe.toLowerCase().includes(k.toLowerCase())))) : undefined;

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      const r = await saveAssignRules(rules);
      if (r.ok) { markSaved(); toast("Правила сохранены — применяются к новым задачам сразу"); }
      else toast(r.error || "Не удалось сохранить");
    } finally { setSaving(false); }
  };

  if (!rules) return <Card><div className="p-8 text-center text-sm text-slate-400">Загрузка…</div></Card>;

  return (
    <Card>
      <CardHeader subtitle={`${rules.length} ${plural(rules.length, "правило", "правила", "правил")} · первое совпавшее срабатывает`} action={
        <button onClick={() => setRules([...rules, {
          id: "rule" + Date.now().toString(36), name: "Новое правило", enabled: true, source: "any", keywords: [], assignTo: "least_loaded", priority: null, dueDays: null,
        }])} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-3.5" /> Правило
        </button>
      } />
      <div className="divide-y divide-slate-100">
        {rules.map((r, i) => (
          <div key={r.id} className={`space-y-2.5 px-5 py-4 ${r.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600">{i + 1}</span>
              <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Название правила"
                className="min-w-40 flex-1 rounded-lg border border-transparent px-2 py-1 text-[14px] font-semibold hover:border-slate-200 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
              <span className="flex items-center gap-2 text-[12px] text-slate-500"><Toggle checked={r.enabled} onChange={() => upd(i, { enabled: !r.enabled })} />{r.enabled ? "включено" : "выключено"}</span>
              <button disabled={i === 0} onClick={() => move(i, -1)} title="Выше — проверяется раньше" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button disabled={i === rules.length - 1} onClick={() => move(i, 1)} title="Ниже" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button onClick={() => setRules(rules.filter((_, xi) => xi !== i))} title="Удалить правило" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-9 text-[13px] text-slate-600">
              <b className="font-semibold text-slate-800">Если</b> заявка
              <select value={r.source} onChange={(e) => upd(i, { source: e.target.value as AssignRule["source"] })} className={rsel}>
                <option value="any">из любого источника</option>
                <option value="telegram">из Telegram-бота</option>
                <option value="crm">создана в CRM</option>
              </select>
              и в тексте есть
              <input value={r.keywords.join(", ")} placeholder="любое слово (пусто — всегда)"
                onChange={(e) => upd(i, { keywords: e.target.value.split(",").map((v) => v.trimStart()) })}
                onBlur={(e) => upd(i, { keywords: e.target.value.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean) })}
                className={`${rsel} min-w-56 flex-1`} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-9 text-[13px] text-slate-600">
              <b className="font-semibold text-slate-800">то</b> назначить
              <select value={r.assignTo} onChange={(e) => upd(i, { assignTo: e.target.value })} className={rsel}>
                <option value="least_loaded">наименее загруженному</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              , приоритет
              <select value={r.priority ?? ""} onChange={(e) => upd(i, { priority: e.target.value || null })} className={rsel}>
                <option value="">не менять</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
              </select>
              , срок
              <input value={r.dueDays ?? ""} onChange={(e) => upd(i, { dueDays: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })}
                placeholder="—" className={`${rsel} w-14 text-center`} />
              дн.
            </div>
          </div>
        ))}
        {rules.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-5 py-3.5 text-[13px]">
            <span className="font-medium text-slate-600">Проверить:</span>
            <input value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="текст заявки, например «нужна ЭСФ для покупателя»"
              className={`${rsel} min-w-64 flex-1 bg-white`} />
            <select value={probeSrc} onChange={(e) => setProbeSrc(e.target.value as "telegram" | "crm")} className={`${rsel} bg-white`}>
              <option value="telegram">из бота</option><option value="crm">из CRM</option>
            </select>
            {probe.trim() && (
              <span className={hit ? "font-medium text-emerald-700" : "text-slate-500"}>
                {hit ? `→ сработает правило ${rules.indexOf(hit) + 1} «${hit.name}»: ${hit.assignTo === "least_loaded" ? "наименее загруженному" : (employees.find((e) => e.id === hit.assignTo)?.name ?? "сотрудник")}` : "→ ни одно правило не сработает, задача останется без исполнителя"}
              </span>
            )}
          </div>
        )}
        {!rules.length && <p className="px-5 py-8 text-center text-sm text-slate-400">Правил пока нет — новые задачи остаются без исполнителя, как раньше.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
        <span className="text-[12px] text-slate-400">Правила проверяются по порядку сверху вниз, срабатывает первое совпавшее. Применяются к новым задачам из CRM и Telegram-бота.</span>
        <SaveButton dirty={dirty} saving={saving} onClick={() => void save()} />
      </div>
    </Card>
  );
}

/* Роли — справка: что видит каждая роль (настраиваемых прав пока нет) */
export function RolesPanel() {
  return (
    <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
      {[
        { name: "Администратор", desc: "Полный доступ: сотрудники, все клиенты и задачи, настройки, журнал.", tone: "purple" as Tone },
        { name: "Бухгалтер", desc: "Клиенты и задачи, назначенные ему в CRM. Без настроек и сотрудников.", tone: "blue" as Tone },
        { name: "Клиент", desc: "Только свои задачи — через Telegram-бота и личный кабинет.", tone: "cyan" as Tone },
        { name: "Гость", desc: "Демо-доступ без реальных данных.", tone: "gray" as Tone },
      ].map((r) => (
        <Card key={r.name} className="p-5">
          <Badge tone={r.tone}>{r.name}</Badge>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{r.desc}</p>
        </Card>
      ))}
    </div>
  );
}

/* Журнал действий: события бота и CRM, живые + архив по месяцам */
export function LogsPanel() {
  const [logFilter, setLogFilter] = useState<"all" | "tg" | "crm">("all");
  const [logPeriod, setLogPeriod] = useState("live");
  const [live, setLive] = useState<LogView[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const monthOptions = useMemo(() => {
    const opts = [{ v: "live", l: "Последние 500" }];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const v = m.toISOString().slice(0, 7);
      opts.push({ v, l: m.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) });
    }
    return opts;
  }, []);
  useEffect(() => {
    setLogsLoading(true);
    setLive(null);
    const fetchers = logPeriod === "live"
      ? [fetchLogs("telegram"), fetchLogs("crm")]
      : [fetchLogsArchive("telegram", logPeriod), fetchLogsArchive("crm", logPeriod)];
    Promise.all(fetchers)
      .then(([tg, crm]) => {
        const rows = [...tg.map((l) => mapLog(l, "tg")), ...crm.map((l) => mapLog(l, "crm"))]
          .sort((a, b) => ((a.ts ?? "") < (b.ts ?? "") ? 1 : -1));
        setLive(rows);
      })
      .catch(() => setLive([]))
      .finally(() => setLogsLoading(false));
  }, [logPeriod]);
  const allLogs: LogView[] = live ?? [];
  const shownLogs = allLogs.filter((l) => logFilter === "all" || l.src === logFilter);
  return (
        <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <FilterChips value={logFilter} onChange={setLogFilter}
          items={([["all", "Все"], ["tg", "Telegram"], ["crm", "CRM"]] as const).map(([id, label]) => ({ id, label }))} />
        <select value={logPeriod} onChange={(e) => setLogPeriod(e.target.value)}
          className="h-7 rounded-md border px-2.5 text-[12px] font-medium capitalize focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400">
          {monthOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
          {allLogs.length > 0 && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
          {logsLoading ? "загрузка…" : allLogs.length ? (logPeriod === "live" ? "живые данные · последние 500" : "архив за месяц · до 10 000 записей") : "записей пока нет"}
        </span>
      </div>
      {shownLogs.length ? (
        <div className="overflow-x-auto">
          <table className="dt">
            <thead>
              <tr>
                <th className="px-4">Время</th><th className="px-4">Источник</th><th className="px-4">Событие</th>
                <th className="px-4">Кто</th><th className="px-4">Исполнитель</th><th className="px-4">Детали</th>
              </tr>
            </thead>
            <tbody>
              {shownLogs.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">{l.time}</td>
                  <td className="px-4 py-2.5"><Badge tone={l.src === "tg" ? "cyan" : "purple"}>{l.src === "tg" ? "Telegram" : "CRM"}</Badge></td>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{l.event}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{l.who}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{l.assignee}</td>
                  <td className="px-4 py-2.5 text-slate-500">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          {logsLoading ? "Загружаем журнал…" : "Событий пока нет — они появятся здесь по мере работы с ботом и CRM."}
        </p>
      )}
    </Card>
  );
}
