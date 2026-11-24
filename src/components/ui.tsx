import type { ReactNode } from "react";
import type React from "react";

const tones = {
  blue: "bg-brand-50 text-brand-700 border-brand-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  yellow: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-red-50 text-red-700 border-red-100",
  gray: "bg-slate-50 text-slate-600 border-slate-200",
  purple: "bg-violet-50 text-violet-700 border-violet-100",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-[12px] leading-none font-medium whitespace-nowrap ${tones[tone]}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Card({ className = "", children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  /* без заголовка (карточка внутри секции настроек, где заголовок уже есть) — тонкая панель действий */
  if (!title) return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 px-5 py-2">
      <span className="text-[12px] text-slate-500">{subtitle}</span>
      {action}
    </div>
  );
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
      <div className="min-w-0">
        <h2 className="text-[14px] leading-5 font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  /* «не назначен» — пустой пунктирный кружок, а не инициалы «НН» */
  if (!name || /^(не назначен|—|-)$/i.test(name.trim())) {
    return <span title="Не назначен" className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300 ${className}`}><UserRound className="size-3.5" /></span>;
  }
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  /* приглушённые фоны с тёмным текстом — спокойнее ярких кругов */
  const palette = ["bg-brand-100 text-brand-700", "bg-violet-100 text-violet-700", "bg-cyan-100 text-cyan-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-emerald-100 text-emerald-800"];
  const color = palette[name.length % palette.length];
  return (
    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-tight select-none ${color} ${className}`}>
      {initials}
    </span>
  );
}

/* ---------- Modal с blur-фоном ---------- */
import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

export function Modal({
  open, onClose, title, children, footer, wide, size,
}: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; footer?: ReactNode; wide?: boolean; size?: "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const maxW = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-3xl" : wide ? "max-w-2xl" : "max-w-lg";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5 "
      onClick={onClose}
    >
      <div
        className={`flex max-h-[calc(100vh-3rem)] w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl ${maxW}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Закрыть" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
let pushToast: ((msg: string) => void) | null = null;
export function toast(msg: string) { pushToast?.(msg); }

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    pushToast = (msg) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, msg }]);
      setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 3500);
    };
    return () => { pushToast = null; };
  }, []);
  return (
    <div className="fixed right-5 bottom-5 z-[100] flex max-w-sm flex-col gap-2">
      {items.map((i) => (
        <div key={i.id} className="rounded-lg bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {i.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({ defaultChecked = true, checked, onChange }: {
  defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  return (
    <button
      onClick={() => { setInner(!on); onChange?.(!on); }}
      role="switch" aria-checked={on} type="button"
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

/* ---------- Dropdown menu ---------- */
import { useRef } from "react";
import { createPortal } from "react-dom";

export function Menu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const MENU_W = 224; // w-56
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(Math.max(r.right - MENU_W, 8), window.innerWidth - MENU_W - 8);
      setPos({ top: r.bottom + 4, left });
    };
    update();
    const h = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <span ref={triggerRef} className="relative inline-block" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
      {trigger}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          {children}
        </div>,
        document.body
      )}
    </span>
  );
}

export function MenuItem({
  children, onClick, danger, icon,
}: { children: ReactNode; onClick?: () => void; danger?: boolean; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors [&_svg]:text-slate-400 ${
        danger ? "text-red-600 hover:bg-red-50 [&_svg]:text-red-500" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="-mx-1 my-1 border-t border-slate-100" />;
}

/* ---------- Form primitives ---------- */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const ctl = "w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-[13px] shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${ctl} h-9 ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${ctl} h-9 py-0 ${props.className ?? ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${ctl} resize-y ${props.className ?? ""}`} />;
}

/* ---------- Confirm modal ---------- */
export function ConfirmModal({
  open, onClose, onConfirm, title, text, confirmLabel = "Удалить", tone = "danger", icon,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; text: string; confirmLabel?: string; tone?: "danger" | "warning"; icon?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5 " onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          {icon}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{text}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant={tone === "danger" ? "dangerSolid" : "primary"} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Общий дизайн-язык (UX-аудит 23.11.2026): одна кнопка, один
   заголовок страницы, одни вкладки. Новые экраны — только из них.
   ============================================================ */
import { useSearchParams } from "react-router-dom";

type BtnVariant = "primary" | "secondary" | "danger" | "dangerSolid" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary: "border border-brand-700/20 bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "border border-slate-300/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300",
  danger: "border border-slate-300/80 bg-white text-red-600 shadow-sm hover:bg-red-50 hover:border-red-200",
  dangerSolid: "border border-red-700/20 bg-red-600 text-white shadow-sm hover:bg-red-700",
  ghost: "border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};
export function Button({
  variant = "primary", size = "md", icon, className = "", children, ...rest
}: { variant?: BtnVariant; size?: "sm" | "md"; icon?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-3.5 text-[13px]";
  const iconOnly = !children;
  return (
    <button type="button" {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${BTN[variant]} ${sz} ${iconOnly ? (size === "sm" ? "w-8 px-0" : "w-9 px-0") : ""} ${className}`}>
      {icon}{children}
    </button>
  );
}

/** Заголовок страницы: название, одна строка «что здесь», действия справа. */
export function PageHeader({ title, subtitle, icon, actions, back }: {
  title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode; back?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] leading-7 font-semibold tracking-[-0.01em] text-slate-900 [&_svg]:size-5 [&_svg]:text-slate-400">{icon}{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Значение вкладки/вида в адресе (?key=value): переживает обновление страницы, им можно поделиться. */
export function useUrlParam<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (v: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key) as T | null;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;
  const set = (v: T) => {
    const next = new URLSearchParams(params);
    if (v === fallback) next.delete(key); else next.set(key, v);
    setParams(next, { replace: true });
  };
  return [value, set];
}

export function Tabs<T extends string>({ items, value, onChange }: {
  items: { id: T; label: string; icon?: React.ComponentType<{ className?: string }>; count?: number }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
      {items.map(({ id, label, icon: Icon, count }) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${value === id ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"}`}>
          {Icon && <Icon className={`size-4 ${value === id ? "text-brand-600" : "text-slate-400"}`} />}{label}
          {count != null && <span className="rounded bg-slate-100 px-1.5 text-[11px] leading-[18px] font-semibold text-slate-500 tabular-nums">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      {icon && <span className="mb-1 flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm [&_svg]:size-5">{icon}</span>}
      <div className="text-[14px] font-medium text-slate-800">{title}</div>
      {hint && <div className="max-w-sm text-[13px] text-slate-400">{hint}</div>}
      {action}
    </div>
  );
}

/** Секция настроек: заголовок + одна строка «на что влияет» + содержимое. */
export function SettingsSection({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/* ---------- Единое сохранение форм настроек ----------
   useDirty: запоминает загруженное значение и говорит, есть ли изменения;
   пока они есть — браузер предупредит при уходе со страницы.
   SaveButton: активна только при изменениях, рядом «Не сохранено». */
export function useDirty<T>(value: T | null | undefined): { dirty: boolean; markSaved: () => void } {
  const base = useRef<string | null>(null);
  const [, force] = useState(0);
  const cur = value == null ? null : JSON.stringify(value);
  if (base.current === null && cur !== null) base.current = cur;
  const dirty = cur !== null && base.current !== null && cur !== base.current;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  return { dirty, markSaved: () => { base.current = cur; force((n) => n + 1); } };
}

export function SaveButton({ dirty, saving, onClick, label = "Сохранить" }: { dirty: boolean; saving: boolean; onClick: () => void; label?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      {dirty && !saving && <span className="flex items-center gap-1.5 text-[12px] font-medium text-amber-700"><span className="size-1.5 rounded-full bg-amber-500" />Не сохранено</span>}
      <Button size="sm" onClick={onClick} disabled={!dirty || saving}>{saving ? "Сохранение…" : label}</Button>
    </span>
  );
}

/** KPI-плитка: подпись, число, необязательная подсказка. Цвет — только у числа
    и только когда он что-то значит (просрочки > 0). Иконка нейтральная. */
export function StatTile({ label, value, hint, icon, tone, to }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode;
  tone?: "default" | "danger" | "success" | "brand"; to?: string;
}) {
  const color = tone === "danger" ? "text-red-600" : tone === "success" ? "text-emerald-600" : tone === "brand" ? "text-brand-600" : "text-slate-900";
  const body = (
    <div className={`h-full rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm ${to ? "transition-colors group-hover:border-slate-300 group-hover:bg-slate-25" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        {icon && <span className="text-slate-400 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className={`mt-2 text-[28px] leading-8 font-semibold tracking-[-0.02em] tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-slate-500">{hint}</div>}
    </div>
  );
  return to ? <LinkTo to={to}>{body}</LinkTo> : body;
}
import { Link as RouterLink } from "react-router-dom";
function LinkTo({ to, children }: { to: string; children: ReactNode }) {
  return <RouterLink to={to} className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-brand-500">{children}</RouterLink>;
}

/** Сегментный переключатель (Мои/Все, Канбан/Таблица, периоды). */
export function Segmented<T extends string>({ items, value, onChange, size = "md" }: {
  items: { id: T; label: ReactNode; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={`inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5 ${size === "sm" ? "h-8" : "h-9"}`}>
      {items.map((it) => (
        <button key={it.id} type="button" role="radio" aria-checked={value === it.id} onClick={() => onChange(it.id)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5 ${value === it.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"}`}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  );
}

/** Фильтр-чипы со счётчиком (статусы клиентов, типы событий календаря). */
export function FilterChips<T extends string>({ items, value, onChange }: {
  items: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button key={it.id} type="button" aria-pressed={on} onClick={() => onChange(it.id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium whitespace-nowrap transition-colors ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
            {it.label}
            {it.count != null && <span className={`tabular-nums ${on ? "text-white/60" : "text-slate-400"}`}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Убирает эмодзи из подписей (должности в карточках клиентов приходят из бота с эмодзи). */
export const plain = (s: string | null | undefined) =>
  String(s ?? "").replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/\s+/g, " ").trim();

/** Приоритет: обычные — тихим текстом, срочные — цветным бейджем (меньше шума в таблицах). */
export function PriorityMark({ value }: { value: string }) {
  if (value === "Высокий") return <Badge tone="yellow">{value}</Badge>;
  if (value === "Критический") return <Badge tone="red">{value}</Badge>;
  return <span className="text-[12px] text-slate-500">{value}</span>;
}
