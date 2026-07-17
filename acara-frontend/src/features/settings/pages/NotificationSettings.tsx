import { useMemo, useState, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  IconAlertCircle,
  IconBell,
  IconCheck,
  IconClipboardCheck,
  IconFileInvoice,
  IconMail,
  IconMessageCircle,
  IconRefresh,
  IconRosetteDiscountCheck,
  IconSettings,
  IconShieldCheck,
  IconStar,
} from "@tabler/icons-react";
import Loader from "../../../components/common/Loader";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "../../notifications/api";

type PreferenceKey = Exclude<keyof NotificationPreferences, "email_enabled">;

type PreferenceOption = {
  key: PreferenceKey;
  title: string;
  description: string;
  icon: ElementType;
  audience?: string;
};

const OPTIONS: PreferenceOption[] = [
  {
    key: "email_booking_updates",
    title: "Booking activity",
    description: "Requests, decisions, cancellations, reschedules, deadlines and status changes.",
    icon: IconClipboardCheck,
  },
  {
    key: "email_quotation_updates",
    title: "Quotations",
    description: "New quotations, responses, revision requests and quotation expiry reminders.",
    icon: IconFileInvoice,
  },
  {
    key: "email_booking_messages",
    title: "Booking messages",
    description: "New messages exchanged between organizers and vendors for an active booking.",
    icon: IconMessageCircle,
  },
  {
    key: "email_completion_updates",
    title: "Completion and issues",
    description: "Delivery confirmation, organizer responses, disputes, reminders and resolutions.",
    icon: IconRosetteDiscountCheck,
  },
  {
    key: "email_review_updates",
    title: "Reviews and ratings",
    description: "Verified feedback received after a service has been completed.",
    icon: IconStar,
    audience: "Vendor activity",
  },
  {
    key: "email_service_updates",
    title: "Service verification",
    description: "Marketplace approval decisions and changes requested by the ACARA team.",
    icon: IconShieldCheck,
    audience: "Vendor activity",
  },
];

const Switch = ({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-40 ${
      checked
        ? "border-purple-600 bg-purple-600"
        : "border-slate-300 bg-slate-200"
    }`}
  >
    <span
      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

const NotificationSettings = () => {
  usePageTitle("Notification Settings");
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [draftOverride, setDraft] = useState<NotificationPreferences | null>(null);
  const [savedOverride, setSaved] = useState<NotificationPreferences | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: fetchNotificationPreferences,
    staleTime: 60_000,
  });

  const draft = draftOverride ?? preferencesQuery.data ?? null;
  const saved = savedOverride ?? preferencesQuery.data ?? null;

  const saveMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(["notification-preferences"], preferences);
      setDraft(preferences);
      setSaved(preferences);
      setSuccessVisible(true);
      window.setTimeout(() => setSuccessVisible(false), 3500);
    },
  });

  const isDirty = useMemo(
    () => draft !== null && saved !== null && JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );
  const activeCategoryCount = draft
    ? OPTIONS.filter((option) => draft[option.key]).length
    : 0;

  const toggle = (key: keyof NotificationPreferences) => {
    if (!draft) return;

    setSuccessVisible(false);
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const resetChanges = () => {
    setDraft(saved);
    setSuccessVisible(false);
  };

  if (preferencesQuery.isPending || draft === null) {
    return <Loader message="Loading communication preferences..." />;
  }

  if (preferencesQuery.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <IconAlertCircle size={24} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Preferences could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your existing notification delivery has not been changed.</p>
          <button
            type="button"
            onClick={() => preferencesQuery.refetch()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            <IconRefresh size={17} /> Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-purple-700">
              <IconSettings size={17} stroke={2} /> Account settings
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Communication preferences</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Choose which ACARA activity is also delivered to your email. Important in-app records remain available in your notification centre.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/40 lg:min-w-72">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Delivery account</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.email ?? "Your account email"}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{user?.role?.replace("_", " ") ?? "ACARA member"} account</p>
          </div>
        </header>

        {successVisible && (
          <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white"><IconCheck size={16} /></span>
            <div><span className="font-semibold">Preferences saved.</span> New email activity will follow these choices.</div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                    <IconMail size={24} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">Email notifications</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${draft.email_enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {draft.email_enabled ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      {draft.email_enabled
                        ? `${activeCategoryCount} of ${OPTIONS.length} activity categories can be emailed to you.`
                        : "All optional email delivery is paused. Your category choices are retained."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={draft.email_enabled}
                  label="Email notifications"
                  onChange={() => toggle("email_enabled")}
                />
              </div>
              <div className="border-t border-purple-100 bg-purple-50/60 px-5 py-3 text-xs leading-5 text-purple-800 sm:px-6">
                Email is an additional alert channel. Booking history, decisions and audit records are never removed when email is paused. Critical account status notices are always emailed for security.
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold text-slate-950">Activity categories</h2>
                <p className="mt-1 text-sm text-slate-600">Fine-tune the updates that matter to your work.</p>
              </div>
              <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-y-0">
                {OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.key}
                      className={`flex items-start gap-4 p-5 sm:p-6 ${index % 2 === 1 ? "lg:border-l lg:border-slate-100" : ""} ${index >= 2 ? "lg:border-t lg:border-slate-100" : ""}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${draft.email_enabled ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"}`}>
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{option.title}</h3>
                            {option.audience && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-600">{option.audience}</p>}
                          </div>
                          <Switch
                            checked={draft[option.key]}
                            disabled={!draft.email_enabled}
                            label={`${option.title} email notifications`}
                            onChange={() => toggle(option.key)}
                          />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-300/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{isDirty ? "You have unsaved changes" : "Your preferences are up to date"}</p>
                <p className="mt-0.5 text-xs text-slate-500">Changes apply to future email notifications.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={!isDirty || saveMutation.isPending}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate(draft)}
                  disabled={!isDirty || saveMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:flex-none"
                >
                  {saveMutation.isPending ? "Saving..." : <><IconCheck size={17} /> Save preferences</>}
                </button>
              </div>
            </section>

            {saveMutation.isError && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <IconAlertCircle size={19} className="mt-0.5 shrink-0" />
                <div><span className="font-semibold">Changes were not saved.</span> Please check your connection and try again. Your previous preferences are still active.</div>
              </div>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <IconShieldCheck size={17} /> Reliable delivery
              </div>
              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><IconBell size={17} /></span>
                  <div><p className="text-sm font-semibold text-slate-900">In-app activity</p><p className="mt-1 text-xs leading-5 text-slate-500">Always retained for reliable booking history and action tracking.</p></div>
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700"><IconMail size={17} /></span>
                  <div><p className="text-sm font-semibold text-slate-900">Email delivery</p><p className="mt-1 text-xs leading-5 text-slate-500">Sent to your verified account email through ACARA's email provider.</p></div>
                </div>
              </div>
              <Link to="/notifications" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700">
                <IconBell size={17} /> Open notification centre
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-300">Good to know</p>
              <h2 className="mt-3 text-lg font-semibold">Keep action-ready updates on</h2>
              <p className="mt-2 text-xs leading-5 text-slate-300">Booking, quotation and completion emails are useful when a response deadline or organizer decision needs attention away from ACARA.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default NotificationSettings;
