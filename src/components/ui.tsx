import type { ReactNode } from "react";
import type React from "react";

const tones = {
  blue: "bg-brand-50 text-brand-600 border-brand-200",
  green: "bg-emerald-50 text-emerald-600 border-emerald-200",
  yellow: "bg-amber-50 text-amber-600 border-amber-200",
  red: "bg-red-50 text-red-600 border-red-200",
  gray: "bg-slate-100 text-slate-600 border-slate-200",
  purple: "bg-violet-50 text-violet-600 border-violet-200",
  cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" />
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

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const palette = ["bg-brand-600", "bg-violet-600", "bg-cyan-600", "bg-amber-600", "bg-rose-600", "bg-emerald-600"];
  const color = palette[name.length % palette.length];
  return (
    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white select-none ${color} ${className}`}>
      {initials}
    </span>
  );
}

/* ---------- Modal с blur-фоном ---------- */
import { X } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[calc(100vh-3rem)] w-full flex-col rounded-xl bg-white shadow-2xl ${maxW}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div>}
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
        <div key={i.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium shadow-lg">
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
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-[left] ${on ? "left-[19px]" : "left-[3px]"}`} />
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
          className="z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
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
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}

/* ---------- Form primitives ---------- */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const ctl = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13.5px] transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${ctl} ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${ctl} ${props.className ?? ""}`} />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          {icon}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{text}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium hover:bg-slate-50">Отмена</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium text-white ${tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}
          >
            {confirmLabel}
          </button>
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

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};
export function Button({
  variant = "primary", size = "md", icon, className = "", children, ...rest
}: { variant?: BtnVariant; size?: "sm" | "md"; icon?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm";
  return (
    <button type="button" {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${sz} ${className}`}>
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{icon}{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
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
          className={`-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition ${value === id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
          {Icon && <Icon className="size-4" />}{label}
          {count != null && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      {icon && <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{icon}</span>}
      <div className="text-sm font-medium text-slate-600">{title}</div>
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
        <h2 className="text-[16px] font-semibold">{title}</h2>
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
      {dirty && !saving && <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-amber-600"><span className="size-1.5 rounded-full bg-amber-500" />Не сохранено</span>}
      <Button size="sm" onClick={onClick} disabled={!dirty || saving}>{saving ? "Сохранение…" : label}</Button>
    </span>
  );
}
