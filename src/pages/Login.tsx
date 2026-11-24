import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, guestLoginRequest } from "../api";

const SHOW_GUEST = import.meta.env.VITE_SHOW_GUEST_LOGIN === "1"
  || /localhost|127\.0\.0\.1|demo/i.test(typeof window !== "undefined" ? window.location.hostname : "");
import { setSession, type Role } from "../auth";
import { resetTasksStore } from "../store/tasks";
import { resetClientsStore } from "../store/clients";
import { resetEmployeesStore } from "../store/employees";
import { resetCalendarEventsStore } from "../store/calendarEvents";
import { BrandMark } from "../components/BrandMark";

export default function Login() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identity.trim() || !password) {
      setError("Заполните оба поля");
      return;
    }
    setLoading(true);
    try {
      const res = await loginRequest(identity.trim(), password);
      if (!res.ok || !res.token || !res.role) {
        setError(
          res.error === "invalid credentials"
            ? "Неверный логин или пароль"
            : res.error === "account blocked"
              ? "Ваш доступ заблокирован администратором"
              : res.error || "Не удалось войти",
        );
        return;
      }
      resetTasksStore();
      resetClientsStore();
      resetEmployeesStore();
      resetCalendarEventsStore();
      setSession({ token: res.token, role: res.role as Role, name: res.name || identity, company: res.company });
      navigate(res.role === "client" ? "/client" : "/dashboard", { replace: true });
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function loginAsGuest() {
    setError(null);
    setLoading(true);
    try {
      const res = await guestLoginRequest();
      if (!res.ok || !res.token) {
        setError(res.error || "Гостевой режим недоступен");
        return;
      }
      resetTasksStore();
      resetClientsStore();
      resetEmployeesStore();
      resetCalendarEventsStore();
      setSession({ token: res.token, role: "guest", name: "Гость" });
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white px-8 pt-6 pb-8 shadow-md">
        <div className="flex items-center justify-center">
          <BrandMark className="h-28" />
        </div>

        <h1 className="text-center text-[20px] font-semibold tracking-[-0.01em]">Вход в систему</h1>
        <p className="mt-1 mb-6 text-center text-[13px] text-slate-500">Finpulse CRM для бухгалтерии</p>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Логин или телефон</label>
            <input
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="+998901234567 или логин"
              autoComplete="username"
              className="h-10 w-full rounded-lg border border-slate-300/80 px-3 text-[14px] transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-3 focus:outline-none bg-white shadow-sm focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10 w-full rounded-lg border border-slate-300/80 px-3 text-[14px] transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-3 focus:outline-none bg-white shadow-sm focus:ring-brand-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-brand-700/20 bg-brand-600 px-3.5 text-[13px] font-medium whitespace-nowrap text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        {/* Демо-вход — только на демо-стенде/локально или если явно включён
            VITE_SHOW_GUEST_LOGIN=1: на боевом адресе с реальными клиентами он
            сбивал с толку (UX-аудит 23.11.2026). */}
        {SHOW_GUEST && (<>
        <div className="my-4 flex items-center gap-3 text-[11px] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" /> или <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={loginAsGuest}
          disabled={loading}
          className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3.5 text-[13px] font-medium whitespace-nowrap text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Войти как гость (демо-доступ)
        </button>
        </>)}

        <p className="mt-5 text-center text-[12px] text-slate-400">
          Пароль для клиента приходит в Telegram-боте после регистрации.
        </p>
      </div>
    </div>
  );
}
