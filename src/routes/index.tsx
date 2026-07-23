import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, RotateCcw, Search, Pencil, Sun, Moon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRM учёт клиентов" },
      { name: "description", content: "Мини CRM для учёта заявок клиентов по банкам и отправителям." },
      { property: "og:title", content: "CRM учёт клиентов" },
      { property: "og:description", content: "Мини CRM для учёта заявок клиентов по банкам и отправителям." },
    ],
  }),
  component: Index,
});

const BANKS = ["Отбасы банк", "РБК", "Шинхан банк", "Береке банк", "БЦК банк"] as const;
const SENDERS_PRESET = ["Канат Б", "Канат И", "Алишер"] as const;

type Status = "active" | "done";

type Client = {
  id: string;
  fio: string;
  bank: string;
  sender: string;
  senderCustom?: string;
  amount: string;
  startDate: string; // yyyy-mm-dd
  status: Status;
  doneDate?: string;
};

const STORAGE_KEY = "crm-clients-v1";
const THEME_KEY = "crm-theme";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to?: string) {
  if (!from) return 0;
  const a = new Date(from + "T00:00:00");
  const b = to ? new Date(to + "T00:00:00") : new Date();
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatAmount(v: string) {
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function Index() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Status>("active");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setClients(JSON.parse(raw));
      const t = (localStorage.getItem(THEME_KEY) as "light" | "dark" | null) ?? "dark";
      setTheme(t);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, loaded]);

  const filtered = useMemo(
    () =>
      clients
        .filter((c) => c.status === tab)
        .filter((c) =>
          query.trim()
            ? [c.fio, c.bank, c.sender, c.senderCustom, c.amount]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase())
            : true,
        )
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [clients, tab, query],
  );

  const counts = useMemo(
    () => ({
      active: clients.filter((c) => c.status === "active").length,
      done: clients.filter((c) => c.status === "done").length,
    }),
    [clients],
  );

  const addClient = (c: Omit<Client, "id" | "status">) => {
    setClients((prev) => [{ ...c, id: uid(), status: "active" }, ...prev]);
    setOpen(false);
  };

  const updateClient = (id: string, patch: Omit<Client, "id" | "status">) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setEditing(null);
  };

  const toggleDone = (id: string) =>
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? c.status === "active"
            ? { ...c, status: "done", doneDate: today() }
            : { ...c, status: "active", doneDate: undefined }
          : c,
      ),
    );

  const remove = (id: string) => setClients((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="min-h-screen app-bg text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              Учёт клиентов
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Заявки, банки, сроки — в одном месте.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Сменить тему"
              className="glass inline-flex items-center justify-center rounded-xl p-2.5 text-foreground transition hover:opacity-90 active:scale-[.98]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 active:scale-[.98]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Новая заявка</span>
              <span className="sm:hidden">Новая</span>
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="glass inline-flex rounded-xl p-1">
            {(["active", "done"] as Status[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "active" ? "Активные" : "Завершённые"}
                <span className="ml-2 rounded-md bg-background/40 px-1.5 py-0.5 text-xs">
                  {t === "active" ? counts.active : counts.done}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="glass w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:w-64"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass mt-10 rounded-2xl border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {tab === "active" ? "Пока нет активных заявок." : "Здесь появятся завершённые заявки."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="glass rounded-2xl p-4 transition hover:border-primary/40 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold sm:text-lg">{c.fio}</h3>
                      <span className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        {c.bank}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                      <Field label="Отправитель" value={c.sender === "custom" ? c.senderCustom || "—" : c.sender} />
                      <Field label="Сумма" value={formatAmount(c.amount)} />
                      <Field label="Начало" value={formatDate(c.startDate)} />
                      <Field
                        label={c.status === "done" ? "Дней (заверш.)" : "Дней в работе"}
                        value={String(daysBetween(c.startDate, c.doneDate))}
                        accent
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => setEditing(c)}
                      title="Редактировать"
                      className="inline-flex items-center justify-center rounded-lg bg-secondary p-2 text-secondary-foreground transition hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleDone(c.id)}
                      title={c.status === "active" ? "Завершить" : "Вернуть в работу"}
                      className="inline-flex items-center justify-center rounded-lg bg-secondary p-2 text-secondary-foreground transition hover:bg-accent"
                    >
                      {c.status === "active" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      title="Удалить"
                      className="inline-flex items-center justify-center rounded-lg bg-secondary p-2 text-secondary-foreground transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && <ClientDialog title="Новая заявка" submitLabel="Добавить" onClose={() => setOpen(false)} onSubmit={addClient} />}
      {editing && (
        <ClientDialog
          title="Редактировать заявку"
          submitLabel="Сохранить"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateClient(editing.id, data)}
        />
      )}
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`truncate text-sm ${accent ? "font-semibold text-primary" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function ClientDialog({
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: (c: Omit<Client, "id" | "status">) => void;
  initial?: Client;
  title: string;
  submitLabel: string;
}) {
  const presetSender = initial
    ? (SENDERS_PRESET as readonly string[]).includes(initial.sender)
      ? initial.sender
      : "custom"
    : SENDERS_PRESET[0];
  const [fio, setFio] = useState(initial?.fio ?? "");
  const [bank, setBank] = useState<string>(initial?.bank ?? BANKS[0]);
  const [sender, setSender] = useState<string>(presetSender);
  const [senderCustom, setSenderCustom] = useState(
    initial?.senderCustom ?? (initial && presetSender === "custom" ? initial.sender : ""),
  );
  const [amount, setAmount] = useState(initial ? formatAmount(initial.amount) : "");
  const [startDate, setStartDate] = useState<string>(initial?.startDate ?? today());

  const canSubmit = fio.trim() && bank && startDate && (sender !== "custom" || senderCustom.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      fio: fio.trim(),
      bank,
      sender,
      senderCustom: sender === "custom" ? senderCustom.trim() : undefined,
      amount: amount.replace(/\s/g, "").trim(),
      startDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="glass-strong w-full max-w-lg rounded-t-3xl p-5 sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Закрыть
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Input label="ФИО клиента" value={fio} onChange={setFio} placeholder="Иванов Иван Иванович" required />

          <Select label="Банк" value={bank} onChange={setBank} options={[...BANKS]} />

          <Select
            label="Отправитель"
            value={sender}
            onChange={setSender}
            options={[...SENDERS_PRESET, "custom"]}
            labels={{ custom: "Свой вариант" }}
          />

          {sender === "custom" && (
            <Input
              label="Имя отправителя"
              value={senderCustom}
              onChange={setSenderCustom}
              placeholder="Введите имя"
              required
            />
          )}

          <Input
            label="Сумма"
            value={amount}
            onChange={(v) => setAmount(formatAmount(v))}
            placeholder="Например, 1 500 000"
            inputMode="numeric"
          />

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
              Дата начала работы
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl bg-input px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-accent"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-xl bg-input px-3 py-2.5 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-input px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-card">
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}
