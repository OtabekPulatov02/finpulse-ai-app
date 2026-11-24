/* Единый раздел «Настройки» (UX-аудит 23.11.2026).
   Раньше настройки жили в трёх местах — «Настройки», «Справочники» и
   «Интеграции», а настройки бота — в пяти. Здесь 7 групп, у каждой
   секции — одна строка «на что влияет», адрес группы в URL и поиск. */
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Bot, CalendarDays, Database, ListTodo, Search, Shield, Sparkles, Building2 } from "lucide-react";
import { PageHeader, SettingsSection, Tabs } from "../components/ui";
import TelegramPanel from "./Integrations";
import Integration1C from "./Integration1C";
import IntegrationAI from "./IntegrationAI";
import { BotTab, LogsPanel, NotifTab, RolesPanel, RulesTab } from "./Settings";
import { CalendarDicts, ClientsDicts, DocTemplatesDicts, KnowledgeBaseDicts, OneCDicts, TasksDicts } from "./Dictionaries";

type Section = { id: string; title: string; hint: string; keywords: string; render: () => ReactNode };
type Group = { id: string; label: string; icon: ComponentType<{ className?: string }>; desc: string; sections: Section[] };

export const SETTINGS_GROUPS: Group[] = [
  {
    id: "telegram", label: "Telegram-бот", icon: Bot, desc: "Как бот принимает заявки клиентов и что пишет в группу бухгалтеров",
    sections: [
      { id: "connection", title: "Подключение", hint: "Работает ли бот и привязана ли группа бухгалтеров.", keywords: "токен webhook группа bind привязка", render: () => <TelegramPanel /> },
      { id: "hours", title: "Часы приёма и SLA", hint: "Когда бот принимает заявки и какой срок выполнения обещает клиенту.", keywords: "sla время работы часы приём доверенные", render: () => <BotTab /> },
      { id: "services", title: "Услуги в меню бота", hint: "Кнопки, которые клиент видит при создании заявки.", keywords: "категории подкатегории услуги меню кнопки", render: () => <TasksDicts only="cats" /> },
      { id: "positions", title: "Должности клиентов", hint: "Варианты должности при регистрации клиента в боте.", keywords: "должность директор бухгалтер регистрация", render: () => <ClientsDicts only="positions" /> },
      { id: "notifications", title: "Уведомления", hint: "Какие сообщения бот отправляет в группу и клиентам. Сохраняется сразу.", keywords: "уведомления дайджест сводка просрочка дедлайн", render: () => <NotifTab /> },
    ],
  },
  {
    id: "tasks", label: "Задачи", icon: ListTodo, desc: "Кому достаются новые задачи и как они проходят по статусам",
    sections: [
      { id: "rules", title: "Автораспределение", hint: "Правила проверяются сверху вниз; первое совпавшее назначает исполнителя, приоритет и срок.", keywords: "распределение правила исполнитель назначение", render: () => <RulesTab /> },
      { id: "statuses", title: "Статусы и приоритеты", hint: "Системные списки — на них завязаны канбан, бот и напоминания.", keywords: "статусы приоритеты архив", render: () => <TasksDicts only="statuses" /> },
    ],
  },
  {
    id: "clients", label: "Клиенты и тарифы", icon: Building2, desc: "Тарифы обслуживания и лимиты операций",
    sections: [
      { id: "tariffs", title: "Тарифы и лимиты", hint: "Цена, месячный лимит операций и пакеты сверх лимита.", keywords: "тариф лимит операции пакет цена", render: () => <ClientsDicts only="tariffs" /> },
    ],
  },
  {
    id: "calendar", label: "Календарь", icon: CalendarDays, desc: "Типы напоминаний о налогах и платежах",
    sections: [
      { id: "reminders", title: "Напоминания", hint: "Категории платежей и налогов, интервалы и повторы напоминаний.", keywords: "напоминание налоги платежи категории повтор", render: () => <CalendarDicts /> },
    ],
  },
  {
    id: "1c", label: "1С", icon: Database, desc: "Базы клиентов в 1С (Clobus) и обмен данными",
    sections: [
      { id: "bases", title: "Базы и обмен", hint: "Состояние баз клиентов, загрузка справочников и документы, созданные ИИ.", keywords: "1с clobus базы синхронизация контрагенты номенклатура", render: () => <Integration1C embedded /> },
      { id: "departments", title: "Подразделения", hint: "Подразделения организаций, загруженные из 1С.", keywords: "подразделения отделы", render: () => <OneCDicts /> },
    ],
  },
  {
    id: "ai", label: "ИИ", icon: Sparkles, desc: "Что ИИ-бухгалтер делает сам и на какие знания опирается",
    sections: [
      { id: "features", title: "Функции и автономность", hint: "Модель, разбор заявок, черновики и автономная работа в 1С.", keywords: "модель openai автономный черновики классификация", render: () => <IntegrationAI embedded /> },
      { id: "knowledge", title: "База знаний", hint: "Проверенные бухгалтерами ответы — ИИ опирается на них в первую очередь.", keywords: "база знаний ответы регламенты", render: () => <KnowledgeBaseDicts /> },
      { id: "templates", title: "Шаблоны договоров", hint: "Шаблоны, по которым ИИ готовит черновики договоров.", keywords: "шаблоны договор документ", render: () => <DocTemplatesDicts /> },
    ],
  },
  {
    id: "access", label: "Доступ и журнал", icon: Shield, desc: "Кто что видит и история действий",
    sections: [
      { id: "roles", title: "Роли", hint: "Что видит каждая роль. Роль сотрудника меняется в разделе «Сотрудники».", keywords: "роли права доступ администратор бухгалтер", render: () => <RolesPanel /> },
      { id: "log", title: "Журнал действий", hint: "События бота и CRM: кто, что и когда сделал.", keywords: "журнал логи история события", render: () => <LogsPanel /> },
    ],
  },
];

export default function SettingsHub() {
  const { group } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const current = SETTINGS_GROUPS.find((g) => g.id === group);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return SETTINGS_GROUPS.flatMap((g) => g.sections
      .filter((sec) => `${sec.title} ${sec.hint} ${sec.keywords} ${g.label}`.toLowerCase().includes(s))
      .map((sec) => ({ g, sec })));
  }, [q]);

  /* переход к секции по #якорю */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [group]);

  if (!current) return <Navigate to="/settings/telegram" replace />;

  return (
    <div className="space-y-5">
      <PageHeader title="Настройки" subtitle="Всё, что настраивается в системе, — в одном месте."
        actions={
          <div className="relative w-72 max-sm:w-full">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти настройку…"
              className="h-9 w-full rounded-lg border border-slate-300/80 bg-white pr-3 pl-9 text-[13px] shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none" />
            {q && (
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {hits.length ? hits.map(({ g, sec }) => (
                  <button key={g.id + sec.id} onClick={() => { setQ(""); navigate(`/settings/${g.id}#${sec.id}`); setTimeout(() => document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth" }), 200); }}
                    className="block w-full rounded-md px-2.5 py-1.5 text-left hover:bg-slate-100">
                    <div className="text-[13px] font-medium">{sec.title}</div>
                    <div className="text-[12px] text-slate-400">{g.label}</div>
                  </button>
                )) : <div className="px-3 py-2.5 text-[13px] text-slate-400">Ничего не нашлось</div>}
              </div>
            )}
          </div>
        } />

      {/* группы — горизонтальные вкладки сверху; липнут под шапкой при прокрутке */}
      <div className="sticky top-14 z-10 -mx-4 bg-white/90 px-4 backdrop-blur sm:-mx-8 sm:px-8">
        <Tabs items={SETTINGS_GROUPS.map(({ id, label, icon }) => ({ id, label, icon }))} value={current.id} onChange={(id) => navigate(`/settings/${id}`)} />
      </div>

      <div className="space-y-7">
        <p className="text-[13px] text-slate-500">{current.desc}</p>
        {current.sections.map((sec) => (
          <SettingsSection key={sec.id} id={sec.id} title={sec.title} hint={sec.hint}>{sec.render()}</SettingsSection>
        ))}
      </div>
    </div>
  );
}

