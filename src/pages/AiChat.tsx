import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Bot, Check, Copy, History, MessageSquarePlus, RotateCcw, Send, Sparkles, Square, Trash2, X,
} from "lucide-react";
import { Button, Card, ConfirmModal, PageHeader } from "../components/ui";
import { Markdown } from "../components/Markdown";
import {
  aiAgent, clearAllAiChats, deleteAiChat, fetchAiChat, fetchAiChats,
  type AgentMessage, type AgentStep, type AiChatMeta,
} from "../api";

interface ChatItem { role: "user" | "assistant"; content: string; steps?: AgentStep[]; askOptions?: string[]; error?: boolean }

/* Шаги агента — человеческими словами, а не именами функций */
const STEP_LABEL: Record<string, string> = {
  crm_get: "Прочитал данные CRM",
  crm_post: "Изменил данные CRM",
  onec_get: "Запрос в 1С",
  onec_post: "Действие в 1С",
  ai_draft: "Подготовил черновик операции",
  memory_get: "Вспомнил факты о клиенте",
  memory_add: "Запомнил факт о клиенте",
  ask_user: "Задал уточняющий вопрос",
  kb_search: "Поиск в базе знаний",
  draft_contract: "Подготовил договор",
  tax_calc: "Рассчитал налог",
  read_attachments: "Прочитал документ",
};
const stepLabel = (t: string) => STEP_LABEL[t] || t;

const SUGGESTIONS = [
  "У кого из бухгалтеров больше всего просрочек?",
  "Какая дебиторка у клиентов по 1С на сегодня?",
  "Посчитай зарплату на руки и соцналог с 8 000 000",
  "Какие задачи со сроком на этой неделе?",
  "Проверь доступность баз 1С",
  "Что ты умеешь?",
];

function fmtWhen(iso: string) {
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title="Скопировать ответ"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-slate-400 hover:bg-slate-100 hover:text-slate-600">
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done ? "Скопировано" : "Копировать"}
    </button>
  );
}

export default function AiChat() {
  const [chats, setChats] = useState<AiChatMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busySince, setBusySince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "one"; id: string } | { kind: "all" } | null>(null);
  const reqId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = busySince !== null;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items, busy]);
  useEffect(() => { fetchAiChats().then(setChats).catch(() => {}); }, []);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);
  /* поле ввода растёт по тексту (до ~8 строк) */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const openChat = async (id: string) => {
    setActiveId(id); setItems([]); setHistoryOpen(false);
    try { setItems(await fetchAiChat(id)); } catch { /* noop */ }
  };
  const newChat = () => { setActiveId(null); setItems([]); setInput(""); setHistoryOpen(false); inputRef.current?.focus(); };

  const doDelete = async () => {
    if (!confirm) return;
    if (confirm.kind === "all") {
      await clearAllAiChats().catch(() => {});
      setChats([]); newChat();
    } else {
      await deleteAiChat(confirm.id).catch(() => {});
      setChats((s) => s.filter((c) => c.id !== confirm.id));
      if (activeId === confirm.id) newChat();
    }
  };

  const send = async (text?: string, base?: ChatItem[]) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const prev = (base ?? items).filter((i) => !i.error);
    const next: ChatItem[] = [...prev, { role: "user", content: q }];
    setItems(next);
    const my = ++reqId.current;
    setBusySince(Date.now()); setNow(Date.now());
    try {
      const history: AgentMessage[] = next.map((i) => ({ role: i.role, content: i.content }));
      const r = await aiAgent(history, activeId);
      if (my !== reqId.current) return; // пользователь нажал «Остановить»
      setItems([...next, r.ok
        ? { role: "assistant", content: r.reply, steps: r.steps, askOptions: r.askOptions }
        : { role: "assistant", content: r.error || "Агент не смог ответить.", error: true }]);
      if (r.chatId) { setActiveId(r.chatId); fetchAiChats().then(setChats).catch(() => {}); }
    } catch {
      if (my !== reqId.current) return;
      setItems([...next, { role: "assistant", content: "Нет связи с сервером. Проверьте интернет и повторите.", error: true }]);
    } finally {
      if (my === reqId.current) setBusySince(null);
    }
  };

  const stop = () => {
    reqId.current++;
    setBusySince(null);
    setItems((s) => [...s, { role: "assistant", content: "Остановлено. Ответ, если он придёт, не будет показан.", error: true }]);
  };

  const retry = () => {
    const withoutErr = items.filter((i) => !i.error);
    const lastUser = [...withoutErr].reverse().find((i) => i.role === "user");
    if (!lastUser) return;
    const idx = withoutErr.lastIndexOf(lastUser);
    void send(lastUser.content, withoutErr.slice(0, idx));
  };

  const elapsed = busy ? Math.max(0, Math.round((now - (busySince as number)) / 1000)) : 0;

  const historyList = (
    <>
      <div className="flex items-center gap-1.5 p-3">
        <Button className="flex-1" size="sm" onClick={newChat} icon={<MessageSquarePlus className="size-4" />}>Новый диалог</Button>
        {!!chats.length && (
          <Button variant="secondary" size="sm" title="Удалить все диалоги" aria-label="Удалить все диалоги"
            onClick={() => setConfirm({ kind: "all" })} icon={<Trash2 className="size-4" />} />
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {!chats.length && <div className="px-2 pt-4 text-center text-xs text-slate-400">Здесь появятся ваши диалоги</div>}
        {chats.map((c) => (
          <div key={c.id} onClick={() => void openChat(c.id)}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition ${activeId === c.id ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{c.title}</div>
              <div className="text-[11px] text-slate-400">{fmtWhen(c.updatedAt)} · {c.count} сообщ.</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setConfirm({ kind: "one", id: c.id }); }}
              className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Удалить диалог" title="Удалить диалог">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4">
      <Card className="flex w-64 shrink-0 flex-col max-md:hidden">{historyList}</Card>

      {historyOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setHistoryOpen(false)}>
          <Card className="absolute inset-y-0 left-0 flex w-72 flex-col rounded-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-sm font-semibold">
              История диалогов
              <button onClick={() => setHistoryOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Закрыть"><X className="size-4" /></button>
            </div>
            {historyList}
          </Card>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <PageHeader
          title="AI-ассистент"
          subtitle="Спросите про задачи, клиентов, 1С и налоги — или поручите действие. Всё, что меняет данные, ассистент сначала уточнит."
          actions={<Button variant="secondary" size="sm" className="md:hidden" onClick={() => setHistoryOpen(true)} icon={<History className="size-4" />}>История</Button>}
        />
        <Card className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {!items.length && (
              <div className="flex min-h-full flex-col items-center justify-center gap-4 py-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles className="size-6" /></span>
                <div className="max-w-md text-[14px] text-slate-500">Ассистент сам прочитает CRM и 1С, посчитает налоги и подготовит документы. Начните с примера:</div>
                <div className="flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => void send(s)}
                      className="rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {items.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl bg-brand-600 px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-white">{m.content}</div>
                ) : (
                  <div className="flex max-w-[90%] min-w-0 gap-2.5">
                    <span className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ${m.error ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"}`}>
                      {m.error ? <AlertTriangle className="size-4" /> : <Bot className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      {!!m.steps?.length && (
                        <div className="mb-1.5 flex flex-wrap gap-1.5">
                          {m.steps.map((st, si) => (
                            <span key={si} title={st.args}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${st.ok ? "border-slate-200 bg-white text-slate-500" : "border-red-200 bg-red-50 text-red-600"}`}>
                              {st.ok ? <Check className="size-3" /> : <X className="size-3" />}{stepLabel(st.tool)}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.error ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[14px] text-red-700">
                          {m.content}
                          {i === items.length - 1 && !busy && <Button variant="secondary" size="sm" onClick={retry} icon={<RotateCcw className="size-3.5" />}>Повторить</Button>}
                        </div>
                      ) : (
                        <>
                          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-[14px] text-slate-800"><Markdown text={m.content} /></div>
                          <div className="mt-1"><CopyButton text={m.content} /></div>
                        </>
                      )}
                      {!m.error && !!m.askOptions?.length && i === items.length - 1 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {m.askOptions.map((opt, oi) => (
                            <button key={oi} type="button" disabled={busy} onClick={() => void send(opt)}
                              className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                              {opt}
                            </button>
                          ))}
                          <span className="px-1 text-[12px] text-slate-400">или напишите свой вариант</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5 text-[13px] text-slate-500">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Bot className="size-4" /></span>
                <span className="flex gap-1">
                  {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
                </span>
                {elapsed < 8 ? "Думаю…" : elapsed < 25 ? `Читаю данные и считаю… ${elapsed} с` : `Сложная задача, ещё немного… ${elapsed} с`}
                <Button variant="ghost" size="sm" onClick={stop} icon={<Square className="size-3" />}>Остановить</Button>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex items-end gap-2 border-t border-slate-200 p-3.5">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
              }}
              placeholder="Например: переведи задачу №106 в «Выполнена» и сообщи клиенту…"
              disabled={busy}
              className="max-h-[200px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] leading-relaxed focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:opacity-60"
            />
            <Button onClick={() => void send()} disabled={busy || !input.trim()} aria-label="Отправить" className="h-[42px]" icon={<Send className="size-4" />} />
          </div>
          <div className="-mt-2 px-4 pb-2 text-[11.5px] text-slate-400">Enter — отправить, Shift+Enter — новая строка</div>
        </Card>
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => void doDelete()}
        title={confirm?.kind === "all" ? "Удалить все диалоги?" : "Удалить диалог?"}
        text="Восстановить будет нельзя."
        icon={<Trash2 className="size-5" />}
      />
    </div>
  );
}
