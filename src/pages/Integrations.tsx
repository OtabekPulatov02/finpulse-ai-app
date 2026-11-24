/* Telegram-бот: живое состояние подключения и инструкция привязки группы.
   Раньше здесь были поля с вшитыми в код значениями, тумблеры без сохранения
   и кнопка «Сохранить», которая ничего не сохраняла (UX-аудит 23.11.2026).
   Секреты (токен, код привязки, ключи базы) в интерфейсе не показываем:
   они живут только в Vercel → Environment Variables. */
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ChevronDown, Copy, XCircle } from "lucide-react";
import { fetchPing } from "../api";
import { Badge, Button, Card, CardHeader, toast } from "../components/ui";

const WEBHOOK = "https://finpulse-crm.vercel.app/api/bot";

type Ping = { ok: boolean; tasks: number; group: boolean; bot: string };

function Row({ ok, title, hint }: { ok: boolean | null; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      {ok === null ? <span className="mt-0.5 size-5 animate-pulse rounded-full bg-slate-200" />
        : ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />}
      <div>
        <div className="text-[14px] font-medium">{title}</div>
        {hint && <div className="mt-0.5 text-[13px] text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

export default function TelegramPanel() {
  const [ping, setPing] = useState<Ping | null>(null);
  const [failed, setFailed] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const check = () => {
    setPing(null); setFailed(false);
    const t0 = performance.now();
    return fetchPing()
      .then((r) => { setPing(r); return Math.round(performance.now() - t0); })
      .catch(() => { setFailed(true); return null; });
  };
  useEffect(() => { void check(); }, []);
  const loading = !ping && !failed;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Состояние" action={
          <Button variant="secondary" size="sm" icon={<Activity className="size-4" />}
            onClick={() => { void check().then((ms) => toast(ms != null ? `Бот отвечает · ${ms} мс` : "Бот не отвечает — проверьте деплой")); }}>
            Проверить
          </Button>
        } />
        <div className="divide-y divide-slate-100">
          <Row ok={loading ? null : !!ping?.ok} title={ping?.ok ? `Бот ${ping.bot} работает` : failed ? "Бот не отвечает" : "Проверяем бота…"}
            hint={failed ? "Сервер не ответил. Проверьте последний деплой в Vercel." : ping ? `Задач, созданных через систему: ${ping.tasks}` : undefined} />
          <Row ok={loading ? null : !!ping?.group} title={ping?.group ? "Группа бухгалтеров привязана" : "Группа бухгалтеров не привязана"}
            hint={ping && !ping.group ? "Без группы карточки заявок и разборы ИИ никуда не приходят — привяжите её по шагам ниже." : "Сюда приходят карточки заявок, разборы ИИ и напоминания."} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Как привязать группу бухгалтеров" />
        <ol className="space-y-2.5 px-5 py-4 text-[14px] text-slate-700">
          <li><b>1.</b> Добавьте бота {ping?.bot || "@finpulse_crm_bot"} в группу бухгалтеров и сделайте администратором.</li>
          <li><b>2.</b> В BotFather выключите privacy mode (<code className="rounded bg-slate-100 px-1">/setprivacy → Disable</code>) — иначе бот не услышит «Бот, …».</li>
          <li><b>3.</b> Напишите в группе <code className="rounded bg-slate-100 px-1">/bind КОД</code>. Код — переменная <code className="rounded bg-slate-100 px-1">BIND_CODE</code> в Vercel; у администратора проекта.</li>
          <li><b>4.</b> Нажмите «Проверить» выше — строка «Группа привязана» станет зелёной.</li>
        </ol>
      </Card>

      <Card>
        <button onClick={() => setDevOpen(!devOpen)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span>
            <span className="block text-[15px] font-semibold">Для разработчика</span>
            <span className="text-[13px] text-slate-500">Webhook и где хранятся ключи</span>
          </span>
          <ChevronDown className={`size-4 text-slate-400 transition ${devOpen ? "rotate-180" : ""}`} />
        </button>
        {devOpen && (
          <div className="space-y-3 border-t border-slate-100 px-5 py-4 text-[13px] text-slate-600">
            <div>
              <div className="mb-1 font-medium text-slate-700">Webhook URL</div>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12px]">{WEBHOOK}</code>
                <Button variant="secondary" size="sm" aria-label="Скопировать" icon={<Copy className="size-4" />}
                  onClick={() => { void navigator.clipboard?.writeText(WEBHOOK).then(() => toast("Скопировано")); }} />
              </div>
            </div>
            <p>
              Токен бота, код привязки группы и ключи базы Redis задаются только в Vercel → Environment Variables
              (<code>TELEGRAM_BOT_TOKEN</code>, <code>BIND_CODE</code>, <code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code>)
              и в интерфейсе не показываются. После изменения нужен повторный деплой.
            </p>
            <Badge tone={ping?.ok ? "green" : "gray"}>{ping?.ok ? "База данных доступна" : "Состояние базы неизвестно"}</Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
