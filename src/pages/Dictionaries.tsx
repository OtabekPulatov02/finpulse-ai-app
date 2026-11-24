import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Building2, CalendarDays, Database, ExternalLink, FileText, ListTodo, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge, Card, CardHeader, SaveButton, toast, useDirty } from "../components/ui";
import {
  addRagDoc, deleteRagDoc, fetchBotCategories, fetchBotPositions, fetchDicts, fetchRagDocs, fetchTariffs, fetch1cDeptSummary,
  saveBotCategories, saveBotPositions, saveDicts, saveTariffs,
  addDocTemplate, deleteDocTemplate, fetchDocTemplates,
  type BotCategory, type Dicts, type RagDoc, type Tariff, type DeptSummaryRow, type DocTemplate,
} from "../api";
import { EDITABLE_STATUSES, PRIORITIES, priorityTone, statusTone } from "../data/demo";

/* ============================================================
   Справочники — единая точка входа для всех настраиваемых
   перечней CRM, сгруппированная по категориям. Раньше это было
   разбросано по вкладкам "Настроек" (часть — реальные данные,
   часть — статичный демо-макет без сохранения). Теперь всё в
   одном месте, и всё, что можно редактировать — реально
   сохраняется в БД.
   ============================================================ */

const CATS = [
  { id: "tasks", label: "Задачи", icon: ListTodo },
  { id: "clients", label: "Клиенты", icon: Building2 },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "onec", label: "1С", icon: Database },
  { id: "ai", label: "База знаний", icon: Sparkles },
  { id: "doctpl", label: "Шаблоны договоров", icon: FileText },
] as const;
type CatId = (typeof CATS)[number]["id"];

/* ---------------- Универсальный редактор списка строк ---------------- */
function EditableListCard({
  title, hint, items, onSave, placeholder,
}: {
  title?: string; hint?: string; items: string[]; onSave: (items: string[]) => Promise<void>; placeholder: string;
}) {
  const [list, setList] = useState(items);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setList(items); setDirty(false); }, [items]);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setList((l) => [...l, v]);
    setDraft("");
    setDirty(true);
  };
  const remove = (i: number) => { setList((l) => l.filter((_, xi) => xi !== i)); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(list);
      toast(`«${title}» сохранено`);
      setDirty(false);
    } catch {
      toast("Не удалось сохранить");
    } finally { setSaving(false); }
  };

  return (
    <Card>
      {title && <CardHeader title={title} />}
      <div className="divide-y divide-slate-100">
        {list.map((v, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <span className="text-[13px] font-medium">{v}</span>
            <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        {!list.length && <p className="px-5 py-4 text-center text-xs text-slate-400">Пусто</p>}
        <div className="flex items-center gap-2 px-5 py-3">
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder={placeholder} className="flex-1 rounded-lg border px-3 py-1.5 text-[13px] focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
          <button onClick={add} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-3.5" />Добавить</button>
        </div>
      </div>
      {hint && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">{hint}</p>}
      {dirty && (
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <SaveButton dirty={dirty} saving={saving} onClick={() => void save()} />
        </div>
      )}
    </Card>
  );
}

/* ---------------- Задачи: категории/подкатегории бота + статусы/приоритеты (справочно) ---------------- */
export function TasksDicts({ only }: { only?: "cats" | "statuses" } = {}) {
  const [cats, setCats] = useState<BotCategory[] | null>(null);
  const [saving, setSaving] = useState(false);
  const catsDirty = useDirty(cats);
  useEffect(() => { fetchBotCategories().then((c) => setCats(c ?? [])).catch(() => setCats([])); }, []);

  const save = async () => {
    if (!cats) return;
    setSaving(true);
    try {
      const r = await saveBotCategories(cats);
      if (r.ok) { catsDirty.markSaved(); toast("Категории сохранены"); }
      else toast(r.error || "Не удалось сохранить");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {only !== "statuses" && <Card>
        <CardHeader title={only ? undefined : "Категории и подкатегории заявок (Telegram-бот)"} subtitle="Категория — кнопка в боте, подкатегории — через запятую" action={
          cats && <button onClick={() => setCats([...cats, { id: "cat" + Date.now().toString(36), name: "Новая категория", subs: [] }])}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="size-3.5" /> Категория
          </button>
        } />
        {!cats ? (
          <div className="p-8 text-center text-sm text-slate-400">Загрузка…</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {cats.map((c, i) => (
                <div key={c.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <input value={c.name} onChange={(e) => setCats(cats.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                    className="w-56 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
                  <input value={c.subs.join(", ")} placeholder="Подкатегории через запятую (пусто — сразу свободный текст)"
                    onChange={(e) => setCats(cats.map((x, xi) => xi === i ? { ...x, subs: e.target.value.split(",").map((v) => v.trimStart()) } : x))}
                    onBlur={(e) => setCats(cats.map((x, xi) => xi === i ? { ...x, subs: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) } : x))}
                    className="min-w-64 flex-1 rounded-lg border px-2.5 py-1.5 text-[13px] focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
                  <button onClick={() => setCats(cats.filter((_, xi) => xi !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                </div>
              ))}
              {!cats.length && <p className="px-5 py-6 text-center text-xs text-slate-400">Категорий пока нет</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
              <span className="text-[12px] text-slate-400">Клиент видит категории табами при создании заявки в боте.</span>
              <SaveButton dirty={catsDirty.dirty} saving={saving} onClick={() => void save()} />
            </div>
          </>
        )}
      </Card>}

      {only !== "cats" && <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Card>
          <CardHeader title="Статусы задач" />
          <div className="divide-y divide-slate-100">
            {[...EDITABLE_STATUSES, "Архив"].map((s) => (
              <div key={s} className="flex items-center justify-between px-5 py-3">
                <Badge tone={s === "Архив" ? "gray" : statusTone[s as (typeof EDITABLE_STATUSES)[number]]}>{s}</Badge>
                {s === "Архив" && <span className="text-xs text-slate-400">авто, через 24ч после выполнения</span>}
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Системные статусы — жёстко привязаны к логике задач (Kanban, бот, напоминания), поэтому не редактируются свободно.</p>
        </Card>
        <Card>
          <CardHeader title="Приоритеты" />
          <div className="divide-y divide-slate-100">
            {PRIORITIES.map((p) => (
              <div key={p} className="px-5 py-3"><Badge tone={priorityTone[p]}>{p}</Badge></div>
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Системный список, используется в фильтрах и сортировке задач.</p>
        </Card>
      </div>}
    </div>
  );
}

/* ---------------- Клиенты: должности + тарифы ---------------- */
export function ClientsDicts({ only }: { only?: "positions" | "tariffs" } = {}) {
  const [positions, setPositions] = useState<string[] | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[] | null>(null);
  const [savingTariffs, setSavingTariffs] = useState(false);
  const tariffsDirty = useDirty(tariffs);
  useEffect(() => {
    fetchBotPositions().then(setPositions).catch(() => setPositions([]));
    fetchTariffs().then(setTariffs).catch(() => setTariffs([]));
  }, []);

  const upd = (i: number, k: keyof Tariff, v: string) =>
    setTariffs((r) => r!.map((t, idx) => idx === i ? { ...t, [k]: k === "name" ? v : v === "" ? null : Number(v.replace(/\D/g, "")) } : t));
  const num = (v: number | null) => (v == null ? "" : String(v));
  const saveTariffsNow = async () => {
    if (!tariffs) return;
    setSavingTariffs(true);
    try {
      const r = await saveTariffs(tariffs);
      if (r.ok) tariffsDirty.markSaved();
      if (r.ok) toast("Тарифы сохранены — лимиты применяются со следующего пересчёта");
      else toast(r.error || "Не удалось сохранить");
    } finally { setSavingTariffs(false); }
  };

  return (
    <div className="space-y-4">
      {only !== "tariffs" && <EditableListCard
        title={only ? undefined : "Должности клиентов"}
        hint="Показываются табами при регистрации в боте и в карточке клиента."
        items={positions ?? []}
        placeholder="Новая должность"
        onSave={async (list) => { const r = await saveBotPositions(list); if (!r.ok) throw new Error(r.error); setPositions(list); }}
      />}

      {only !== "positions" && <Card>
        <CardHeader title={only ? undefined : "Тарифы и лимиты операций"} subtitle={tariffs ? `Тарифов: ${tariffs.length}` : undefined} action={
          tariffs && <button onClick={() => setTariffs((r) => [...r!, { id: "t" + Date.now().toString(36), name: "Новый тариф", price: 0, monthlyLimit: 30, overPackOps: 10, overPackPrice: 0 }])}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="size-3.5" /> Добавить тариф
          </button>
        } />
        {!tariffs ? <div className="p-8 text-center text-sm text-slate-400">Загрузка…</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="dt">
                <thead>
                  <tr>
                    <th className="px-4">Название</th>
                    <th className="px-4">Цена, сум/мес</th>
                    <th className="px-4">Лимит операций/мес</th>
                    <th className="px-4">Пакет сверхлимита, опер.</th>
                    <th className="px-4">Цена пакета, сум</th>
                    <th className="px-4" />
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((t, i) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2"><input value={t.name} onChange={(e) => upd(i, "name", e.target.value)} className="w-36 rounded-lg border px-2.5 py-1.5 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" /></td>
                      <td className="px-4 py-2"><input value={num(t.price)} onChange={(e) => upd(i, "price", e.target.value)} className="w-28 rounded-lg border px-2.5 py-1.5 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" /></td>
                      <td className="px-4 py-2"><input value={num(t.monthlyLimit)} onChange={(e) => upd(i, "monthlyLimit", e.target.value)} placeholder="∞" className="w-24 rounded-lg border px-2.5 py-1.5 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" /></td>
                      <td className="px-4 py-2"><input value={num(t.overPackOps)} onChange={(e) => upd(i, "overPackOps", e.target.value)} placeholder="—" className="w-24 rounded-lg border px-2.5 py-1.5 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" /></td>
                      <td className="px-4 py-2"><input value={num(t.overPackPrice)} onChange={(e) => upd(i, "overPackPrice", e.target.value)} placeholder="—" className="w-28 rounded-lg border px-2.5 py-1.5 focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" /></td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setTariffs((r) => r!.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
              <span className="text-[12px] text-slate-400">Пустой лимит = безлимит. «Операция» — выполненная задача клиента за календарный месяц.</span>
              <SaveButton dirty={tariffsDirty.dirty} saving={savingTariffs} onClick={() => void saveTariffsNow()} />
            </div>
          </>
        )}
      </Card>}
    </div>
  );
}

/* ---------------- Календарь: платёжные/налоговые подсказки — реальные;
   типы событий, интервалы и периодичность — жёстко зашиты в код (цвета,
   иконки, фильтры и маппинг на бэкенд), поэтому оставлены только для
   просмотра, а не свободного редактирования, чтобы не сломать сопоставление. ---------------- */
function ReminderTypeLabelsCard({ dicts, onSaved }: { dicts: Dicts; onSaved: (d: Dicts) => void }) {
  const [tax, setTax] = useState(dicts.reminderTypeLabels.tax);
  const [pay, setPay] = useState(dicts.reminderTypeLabels.pay);
  const [saving, setSaving] = useState(false);
  const dirty = tax !== dicts.reminderTypeLabels.tax || pay !== dicts.reminderTypeLabels.pay;

  const save = async () => {
    setSaving(true);
    try {
      const next = { ...dicts, reminderTypeLabels: { tax, pay } };
      const r = await saveDicts(next);
      if (!r.ok) { toast(r.error || "Не удалось сохранить"); return; }
      onSaved(next);
      toast("Названия типов напоминаний сохранены");
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Типы напоминания (дропдаун при создании)" />
      <div className="grid grid-cols-2 gap-4 p-5 max-lg:grid-cols-1">
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-slate-500">Налоговый тип</div>
          <input value={tax} onChange={(e) => setTax(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-slate-500">Платёжный тип</div>
          <input value={pay} onChange={(e) => setPay(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-[13px] focus:border-brand-500 focus:outline-none border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100 placeholder:text-slate-400" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
        <span className="text-[12px] text-slate-400">Два системных типа напоминания (налог/платёж) — можно переименовать подпись, но не добавить третий: логика формы и цвета в календаре завязаны именно на эти два.</span>
        <SaveButton dirty={dirty} saving={saving} onClick={() => void save()} />
      </div>
    </Card>
  );
}

export function CalendarDicts() {
  const [dicts, setDicts] = useState<Dicts | null>(null);
  useEffect(() => { fetchDicts().then(setDicts).catch(() => setDicts(null)); }, []);
  if (!dicts) return <Card><div className="p-8 text-center text-sm text-slate-400">Загрузка…</div></Card>;

  const saveField = (key: keyof Dicts) => async (list: string[]) => {
    const next = { ...dicts, [key]: list };
    const r = await saveDicts(next);
    if (!r.ok) throw new Error(r.error);
    setDicts(next);
  };

  return (
    <div className="space-y-4">
      <ReminderTypeLabelsCard dicts={dicts} onSaved={setDicts} />

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <EditableListCard
          title="Категории платежей"
          hint="Подсказки при создании напоминания-платежа в календаре — реально влияют на форму."
          items={dicts.paymentCategories} placeholder="Новая категория" onSave={saveField("paymentCategories")} />
        <EditableListCard
          title="Категории налогов/отчётов"
          hint="Подсказки при создании напоминания-налога в календаре — реально влияют на форму."
          items={dicts.taxCategories} placeholder="Новая категория" onSave={saveField("taxCategories")} />
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <Card>
          <CardHeader title="Типы событий календаря" />
          <div className="divide-y divide-slate-100">
            {dicts.calendarEventTypes.map((t) => <div key={t} className="px-5 py-3 text-[13px] font-medium">{t}</div>)}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Системные — у каждого свой цвет/иконка/фильтр в коде календаря.</p>
        </Card>
        <Card>
          <CardHeader title="Интервалы напоминаний" />
          <div className="divide-y divide-slate-100">
            {dicts.reminderIntervals.map((t) => <div key={t} className="px-5 py-3 text-[13px] font-medium">{t}</div>)}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Системные — каждый жёстко привязан к числу дней в форме напоминания.</p>
        </Card>
        <Card>
          <CardHeader title="Периодичность повторов" />
          <div className="divide-y divide-slate-100">
            {dicts.repeatPeriods.map((t) => <div key={t} className="px-5 py-3 text-[13px] font-medium">{t}</div>)}
          </div>
          <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Системные — соответствуют фиксированным значениям на бэкенде.</p>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- 1С: синканные подразделения (только чтение) ---------------- */
export function OneCDicts() {
  const [rows, setRows] = useState<DeptSummaryRow[] | null>(null);
  useEffect(() => { fetch1cDeptSummary().then(setRows).catch(() => setRows([])); }, []);

  return (
    <Card>
      <CardHeader subtitle="Загружаются из 1С по каждой организации" action={
        <Link to="/settings/1c" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <ExternalLink className="size-3.5" /> Синк в разделе «1С»
        </Link>
      } />
      {!rows ? (
        <div className="p-8 text-center text-sm text-slate-400">Загрузка…</div>
      ) : rows.length ? (
        <div className="divide-y divide-slate-100">
          {rows.map((b) => (
            <div key={b.code} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium">{b.name}</span>
                <Badge tone={b.count ? "green" : "gray"}>{b.count} подразделений</Badge>
              </div>
              {!!b.items.length && <p className="mt-1 truncate text-xs text-slate-400">{b.items.join(", ")}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Базы не найдены</p>
      )}
      <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">Данные приходят из 1С синком (ночной крон + кнопка «Синк всего из 1С») — редактируются в самой 1С, здесь только просмотр.</p>
    </Card>
  );
}

export function KnowledgeBaseDicts() {
  const [docs, setDocs] = useState<RagDoc[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => fetchRagDocs().then(setDocs).catch(() => setDocs([]));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim() || !content.trim()) { toast("Заполните заголовок и текст ответа"); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const r = await addRagDoc({ title: title.trim(), content: content.trim(), tags });
      if (r.ok) {
        toast("Добавлено в базу знаний");
        setTitle(""); setContent(""); setTagsInput("");
        load();
      } else {
        toast(r.error || "Не удалось добавить");
      }
    } catch {
      toast("Не удалось добавить — проверьте соединение и попробуйте снова");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      const r = await deleteRagDoc(id);
      if (r.ok) { toast("Удалено"); load(); } else { toast(r.error || "Не удалось удалить"); }
    } catch {
      toast("Не удалось удалить — попробуйте ещё раз");
    }
  };

  const inputClass = "w-full rounded-lg border px-3 py-2 transition focus:border-brand-500 focus:outline-none text-[13px] border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100";

  return (
    <Card>
      
      <div className="space-y-3 border-b border-slate-100 p-5">
        <p className="text-xs text-slate-400">
          Проверенные бухгалтерами ответы и регламенты — ИИ ищет здесь ПЕРЕД тем, как отвечать своими словами на вопросы по учёту/налогам УЗ, и явно цитирует найденное вместо общих рассуждений.
        </p>
        <input placeholder="Заголовок вопроса/темы (напр. «Как оформить возврат НДС для экспортёров»)" value={title}
          onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <textarea placeholder="Проверенный ответ / регламент" value={content} rows={4}
          onChange={(e) => setContent(e.target.value)} className={inputClass} />
        <input placeholder="Теги через запятую (необязательно)" value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)} className={inputClass} />
        <button onClick={add} disabled={saving}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-700/20 bg-brand-600 px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-3.5" /> {saving ? "Добавляем…" : "Добавить в базу знаний"}
        </button>
      </div>
      {docs === null ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Загружаем…</p>
      ) : docs.length ? (
        <div className="divide-y divide-slate-100">
          {docs.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-700">{d.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{d.content}</div>
                {d.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.tags.map((t) => <Badge key={t} tone="gray">{t}</Badge>)}
                  </div>
                )}
              </div>
              <button onClick={() => remove(d.id)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-400">База знаний пока пуста — добавьте первый проверенный ответ.</p>
      )}
    </Card>
  );
}

export function DocTemplatesDicts() {
  const [templates, setTemplates] = useState<DocTemplate[] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Договоры");
  const [body, setBody] = useState("");
  const [reqFieldsInput, setReqFieldsInput] = useState("subject, amount, term");
  const [saving, setSaving] = useState(false);

  const load = () => fetchDocTemplates().then(setTemplates).catch(() => setTemplates([]));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim() || !body.trim()) { toast("Заполните название и текст шаблона"); return; }
    setSaving(true);
    try {
      const requiredFields = reqFieldsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const r = await addDocTemplate({ name: name.trim(), category: category.trim(), body: body.trim(), requiredFields });
      if (r.ok) {
        toast("Шаблон добавлен");
        setName(""); setBody("");
        load();
      } else {
        toast(r.error || "Не удалось добавить шаблон");
      }
    } catch {
      toast("Не удалось добавить — проверьте соединение и попробуйте снова");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      const r = await deleteDocTemplate(id);
      if (r.ok) { toast("Шаблон удалён"); load(); } else { toast(r.error || "Не удалось удалить"); }
    } catch {
      toast("Не удалось удалить — попробуйте ещё раз");
    }
  };

  const inputClass = "w-full rounded-lg border px-3 py-2 transition focus:border-brand-500 focus:outline-none text-[13px] border-slate-300/80 bg-white shadow-sm focus:ring-3 focus:ring-brand-100";

  return (
    <Card>
      
      <div className="space-y-3 border-b border-slate-100 p-5">
        <p className="text-xs text-slate-400">
          ИИ сам предлагает подходящий шаблон (по истории клиента), автозаполняет реквизиты организации/контрагента из 1С/CRM и спрашивает только недостающие поля — предмет, сумму, срок и т.п. Плейсхолдеры в тексте — вида <code className="rounded bg-slate-100 px-1">{"{{subject}}"}</code>. Поля из списка «обязательные» ИИ ОБЯЗАТЕЛЬНО уточнит у пользователя, если их нет в тексте задачи.
        </p>
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <input placeholder="Название шаблона (напр. «Договор оказания услуг»)" value={name}
            onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input placeholder="Категория (напр. «Договоры»)" value={category}
            onChange={(e) => setCategory(e.target.value)} className={inputClass} />
        </div>
        <textarea placeholder="Текст шаблона с плейсхолдерами {{organization}}, {{counterparty}}, {{subject}}, {{amount}}, {{term}}…" value={body} rows={8}
          onChange={(e) => setBody(e.target.value)} className={inputClass + " font-mono"} />
        <input placeholder="Обязательные поля через запятую (напр. subject, amount, term)" value={reqFieldsInput}
          onChange={(e) => setReqFieldsInput(e.target.value)} className={inputClass} />
        <button onClick={add} disabled={saving}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-700/20 bg-brand-600 px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-3.5" /> {saving ? "Добавляем…" : "Добавить шаблон"}
        </button>
      </div>
      {templates === null ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Загружаем…</p>
      ) : templates.length ? (
        <div className="divide-y divide-slate-100">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-700">{t.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{t.category}</div>
                {t.requiredFields.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.requiredFields.map((f) => <Badge key={f} tone="gray">{f}</Badge>)}
                  </div>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Шаблонов пока нет.</p>
      )}
    </Card>
  );
}

export default function Dictionaries() {
  const [cat, setCat] = useState<CatId>("tasks");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight"><BookOpen className="size-6 text-brand-600" />Справочники</h1>
        <p className="mt-0.5 text-sm text-slate-500">Все настраиваемые перечни CRM — в одном месте, по категориям</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {CATS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setCat(id)}
            className={`-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition ${cat === id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            <Icon className="size-4" />{label}
          </button>
        ))}
      </div>

      {cat === "tasks" && <TasksDicts />}
      {cat === "clients" && <ClientsDicts />}
      {cat === "calendar" && <CalendarDicts />}
      {cat === "onec" && <OneCDicts />}
      {cat === "ai" && <KnowledgeBaseDicts />}
      {cat === "doctpl" && <DocTemplatesDicts />}
    </div>
  );
}
