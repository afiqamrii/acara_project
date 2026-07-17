import { useMemo, useState, type ElementType, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  IconAlertCircle,
  IconBell,
  IconCheck,
  IconClock,
  IconDeviceFloppy,
  IconHistory,
  IconLock,
  IconMail,
  IconRefresh,
  IconRestore,
  IconSettings,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchAdminSettings,
  updateAdminSettings,
  type AdminSettingKey,
  type AdminSettingValues,
  type AdminSettingsResponse,
  type SettingMetadata,
} from "../api";

type ApiError = {
  message?: string;
  errors?: Record<string, string[]>;
};

type NumberSettingProps = {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  icon: ElementType;
  metadata: SettingMetadata;
  onChange: (value: number) => void;
};

const formatDateTime = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const MetadataLine = ({ metadata }: { metadata: SettingMetadata }) => (
  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400">
    {metadata.source === "admin_override" ? (
      <>
        <IconUser size={13} className="text-indigo-500" />
        <span>
          Last changed by <span className="font-semibold text-slate-600">{metadata.updated_by?.name ?? "Former administrator"}</span>
          {metadata.updated_at ? ` · ${formatDateTime(metadata.updated_at)}` : ""}
        </span>
      </>
    ) : (
      <>
        <IconSettings size={13} />
        <span>Using the deployment default until an administrator changes it</span>
      </>
    )}
  </div>
);

const NumberSetting = ({
  label,
  description,
  value,
  min,
  max,
  suffix,
  icon: Icon,
  metadata,
  onChange,
}: NumberSettingProps) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition focus-within:border-indigo-300 focus-within:shadow-md">
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
        <Icon size={21} />
      </span>
      <div className="min-w-0 flex-1">
        <label className="text-sm font-semibold text-slate-950">{label}</label>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
    <div className="mt-5 flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-slate-950 outline-none"
      />
      <span className="border-l border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {suffix}
      </span>
    </div>
    <p className="mt-2 text-[10px] text-slate-400">Allowed range: {min}–{max} hours</p>
    <MetadataLine metadata={metadata} />
  </article>
);

const TimelinePreview = ({
  title,
  responseHours,
  reminderHours,
  audience,
}: {
  title: string;
  responseHours: number;
  reminderHours: number;
  audience: string;
}) => {
  const reminderPosition = Math.max(5, Math.min(95, ((responseHours - reminderHours) / responseHours) * 100));

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-950">{title}</p>
          <p className="mt-1 text-[10px] leading-4 text-indigo-700/70">Preview for {audience}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm">{responseHours}h total</span>
      </div>
      <div className="relative mt-6 h-2 rounded-full bg-indigo-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: `${reminderPosition}%` }} />
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-amber-500 shadow" style={{ left: `${reminderPosition}%` }} />
      </div>
      <div className="mt-3 flex justify-between gap-4 text-[10px] text-slate-500">
        <span>Action starts</span>
        <span className="text-center font-semibold text-amber-700">Reminder at {responseHours - reminderHours}h</span>
        <span>Deadline</span>
      </div>
    </div>
  );
};

const emptyValues: AdminSettingValues = {
  booking_response_hours: 48,
  booking_reminder_hours: 12,
  completion_response_hours: 72,
  completion_reminder_hours: 24,
  booking_email_enabled: false,
};

const AdminSettings = () => {
  usePageTitle("Admin Settings");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AdminSettingValues | null>(null);
  const [savedValues, setSavedValues] = useState<AdminSettingValues | null>(null);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchAdminSettings,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const form = draft ?? settingsQuery.data?.settings ?? emptyValues;
  const baseline = savedValues ?? settingsQuery.data?.settings ?? emptyValues;

  const mutation = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: (response) => {
      queryClient.setQueryData<AdminSettingsResponse>(["admin-settings"], response);
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setDraft(response.settings);
      setSavedValues(response.settings);
      setReason("");
      setError("");
      setSuccess(response.message ?? "Platform settings saved successfully.");
    },
    onError: (caught) => {
      const apiError = caught as AxiosError<ApiError>;
      const errors = apiError.response?.data.errors;
      setSuccess("");
      setError(
        errors?.booking_reminder_hours?.[0]
          ?? errors?.completion_reminder_hours?.[0]
          ?? errors?.booking_response_hours?.[0]
          ?? errors?.completion_response_hours?.[0]
          ?? errors?.change_reason?.[0]
          ?? apiError.response?.data.message
          ?? "The platform settings could not be saved.",
      );
    },
  });

  const changedKeys = useMemo(
    () => (Object.keys(form) as AdminSettingKey[]).filter((key) => form[key] !== baseline[key]),
    [baseline, form],
  );
  const hasChanges = changedKeys.length > 0;
  const bookingTimingValid = form.booking_response_hours >= 2
    && form.booking_response_hours <= 168
    && form.booking_reminder_hours >= 1
    && form.booking_reminder_hours < form.booking_response_hours;
  const completionTimingValid = form.completion_response_hours >= 2
    && form.completion_response_hours <= 336
    && form.completion_reminder_hours >= 1
    && form.completion_reminder_hours < form.completion_response_hours;
  const reasonValid = reason.trim().length >= 10;
  const canSave = hasChanges && bookingTimingValid && completionTimingValid && reasonValid && !mutation.isPending;

  const updateNumber = (key: keyof AdminSettingValues, value: number) => {
    setSuccess("");
    setError("");
    setDraft((current) => ({ ...(current ?? form), [key]: Number.isFinite(value) ? value : 0 }));
  };

  const resetChanges = () => {
    setDraft(baseline);
    setReason("");
    setError("");
    setSuccess("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    mutation.mutate({ ...form, change_reason: reason.trim() });
  };

  if (settingsQuery.isPending) return <Loader message="Loading platform configuration..." />;
  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <IconAlertCircle className="mx-auto text-red-600" size={36} />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Platform settings could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">No configuration has been changed. Check the connection and try again.</p>
          <button onClick={() => settingsQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
            <IconRefresh size={17} /> Try again
          </button>
        </section>
      </main>
    );
  }

  const { metadata } = settingsQuery.data;
  const overriddenCount = Object.values(metadata).filter((item) => item.source === "admin_override").length;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <form onSubmit={submit} className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-200/30 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300"><IconSettings size={17} /> Platform configuration</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Admin settings</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Control operational response windows and optional booking emails without exposing deployment secrets or rewriting environment configuration.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">5 managed controls</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{overriddenCount} administrator override{overriddenCount === 1 ? "" : "s"}</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">Audit protected</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm lg:min-w-64">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-200">Configuration status</p>
              <div className="mt-3 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${hasChanges ? "bg-amber-300" : "bg-emerald-300"}`} /><p className="text-sm font-semibold">{hasChanges ? `${changedKeys.length} unsaved change${changedKeys.length === 1 ? "" : "s"}` : "All changes saved"}</p></div>
              <p className="mt-2 text-xs leading-5 text-slate-300">Changes affect new deadlines and future email activity. Existing recorded deadlines remain unchanged.</p>
            </div>
          </div>
        </header>

        {(success || error) && (
          <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {error ? <IconAlertCircle className="mt-0.5 shrink-0" size={19} /> : <IconCheck className="mt-0.5 shrink-0" size={19} />}
            <p>{error || success}</p>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
          <div>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><IconClock size={20} /></span>
              <div><h2 className="text-lg font-semibold text-slate-950">Booking request lifecycle</h2><p className="mt-1 text-xs leading-5 text-slate-500">Set how long vendors have to respond and when ACARA should send the final reminder.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberSetting label="Vendor response window" description="Time allowed for a vendor to respond before a pending booking or quotation expires." value={form.booking_response_hours} min={2} max={168} suffix="hours" icon={IconClock} metadata={metadata.booking_response_hours} onChange={(value) => updateNumber("booking_response_hours", value)} />
              <NumberSetting label="Vendor reminder lead time" description="How many hours before expiry ACARA sends the vendor's final response reminder." value={form.booking_reminder_hours} min={1} max={Math.max(1, form.booking_response_hours - 1)} suffix="hours" icon={IconBell} metadata={metadata.booking_reminder_hours} onChange={(value) => updateNumber("booking_reminder_hours", value)} />
            </div>
            {!bookingTimingValid && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600"><IconAlertCircle size={15} /> Reminder lead time must be at least 1 hour and shorter than the full response window.</p>}
          </div>
          <TimelinePreview title="Vendor decision timeline" responseHours={Math.max(1, form.booking_response_hours)} reminderHours={Math.max(0, Math.min(form.booking_reminder_hours, form.booking_response_hours))} audience="new booking requests and quotation revisions" />
        </section>

        <section className="grid gap-6 border-t border-slate-200 pt-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
          <div>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><IconShieldCheck size={20} /></span>
              <div><h2 className="text-lg font-semibold text-slate-950">Completion review lifecycle</h2><p className="mt-1 text-xs leading-5 text-slate-500">Set the organizer review period before an undisputed service completion is confirmed automatically.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberSetting label="Organizer review window" description="Time allowed to confirm delivery or report an issue after the vendor submits completion." value={form.completion_response_hours} min={2} max={336} suffix="hours" icon={IconShieldCheck} metadata={metadata.completion_response_hours} onChange={(value) => updateNumber("completion_response_hours", value)} />
              <NumberSetting label="Organizer reminder lead time" description="How many hours before auto-confirmation ACARA reminds the organizer to review delivery." value={form.completion_reminder_hours} min={1} max={Math.max(1, form.completion_response_hours - 1)} suffix="hours" icon={IconBell} metadata={metadata.completion_reminder_hours} onChange={(value) => updateNumber("completion_reminder_hours", value)} />
            </div>
            {!completionTimingValid && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600"><IconAlertCircle size={15} /> Reminder lead time must be at least 1 hour and shorter than the organizer review window.</p>}
          </div>
          <TimelinePreview title="Organizer review timeline" responseHours={Math.max(1, form.completion_response_hours)} reminderHours={Math.max(0, Math.min(form.completion_reminder_hours, form.completion_response_hours))} audience="new vendor completion submissions" />
        </section>

        <section className="border-t border-slate-200 pt-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><IconMail size={20} /></span>
            <div><h2 className="text-lg font-semibold text-slate-950">Operational email delivery</h2><p className="mt-1 text-xs leading-5 text-slate-500">Control optional booking, quotation, message, review and service update emails across the platform.</p></div>
          </div>
          <article className={`rounded-2xl border p-5 shadow-sm transition ${form.booking_email_enabled ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${form.booking_email_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><IconMail size={21} /></span>
                <div><p className="text-sm font-semibold text-slate-950">Booking activity emails</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{form.booking_email_enabled ? "Enabled — eligible activity will be queued through the configured Resend mailer." : "Paused — in-app notifications continue, but optional activity emails are not queued."}</p></div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.booking_email_enabled}
                onClick={() => { setSuccess(""); setError(""); setDraft((current) => ({ ...(current ?? form), booking_email_enabled: !(current ?? form).booking_email_enabled })); }}
                className={`relative h-8 w-14 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-indigo-100 ${form.booking_email_enabled ? "bg-emerald-600" : "bg-slate-300"}`}
              >
                <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${form.booking_email_enabled ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
            <MetadataLine metadata={metadata.booking_email_enabled} />
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-800"><IconLock className="mt-0.5 shrink-0" size={16} /><p><span className="font-semibold">Security protection:</span> password reset and mandatory account-security emails remain enabled regardless of this switch. Mail credentials stay in the server environment and are never exposed here.</p></div>
          </article>
        </section>

        <section className="grid gap-6 border-t border-slate-200 pt-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><IconHistory className="mt-0.5 text-indigo-700" size={20} /><div><h2 className="text-base font-semibold text-slate-950">Reason for change</h2><p className="mt-1 text-xs leading-5 text-slate-500">Explain the operational reason for this configuration update. It will be stored permanently in the admin audit log.</p></div></div>
            <textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(""); setSuccess(""); }} maxLength={500} rows={4} placeholder="Example: Extend vendor response time for the upcoming festive operations period." className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50" />
            <div className="mt-2 flex items-center justify-between gap-4 text-[10px]"><span className={hasChanges && !reasonValid ? "font-medium text-amber-700" : "text-slate-400"}>{hasChanges && !reasonValid ? "Enter at least 10 characters before saving." : "Required only when settings have changed."}</span><span className="text-slate-400">{reason.length}/500</span></div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">Change summary</p>
            <p className="mt-3 text-2xl font-semibold">{changedKeys.length}</p>
            <p className="mt-1 text-xs text-slate-400">unsaved platform control{changedKeys.length === 1 ? "" : "s"}</p>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
              {changedKeys.length === 0 ? <p>No configuration differences detected.</p> : changedKeys.map((key) => <div key={key} className="flex items-center gap-2"><IconCheck size={14} className="text-emerald-300" /><span>{key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</span></div>)}
            </div>
            <div className="mt-6 grid gap-2">
              <button type="submit" disabled={!canSave} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"><IconDeviceFloppy size={17} /> {mutation.isPending ? "Saving..." : "Save settings"}</button>
              <button type="button" onClick={resetChanges} disabled={!hasChanges || mutation.isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><IconRestore size={16} /> Discard changes</button>
            </div>
          </aside>
        </section>
      </form>
    </main>
  );
};

export default AdminSettings;
