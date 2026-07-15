import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconAlertCircle,
  IconBriefcase,
  IconCalendarStats,
  IconCheck,
  IconCirclePlus,
  IconClipboardCheck,
  IconEdit,
  IconExternalLink,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconStar,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import type { AxiosError } from "axios";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchManagedServices,
  resubmitManagedService,
  updateManagedService,
  updateServiceVisibility,
  type ManagedService,
  type ServiceDisplayStatus,
  type UpdateServiceInput,
} from "../serviceManagementApi";

type ServiceFilter = "all" | ServiceDisplayStatus;

const STATUS_META: Record<
  ServiceDisplayStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  approved: {
    label: "Active",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    description: "Visible to organizers",
  },
  paused: {
    label: "Paused",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
    description: "Hidden from new requests",
  },
  pending_verification: {
    label: "Pending review",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    description: "Awaiting admin verification",
  },
  rejected: {
    label: "Changes required",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    description: "Update and resubmit",
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const isImagePortfolio = (url: string | null) =>
  Boolean(url && /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url));

const apiErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>).response;
  const validationMessage = Object.values(response?.data?.errors ?? {})[0]?.[0];
  return validationMessage ?? response?.data?.message ?? fallback;
};

const ServiceStatus = ({ status }: { status: ServiceDisplayStatus }) => {
  const meta = STATUS_META[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const EditServiceModal = ({
  editor,
  onChange,
  onClose,
  onSubmit,
  saving,
  error,
}: {
  editor: UpdateServiceInput;
  onChange: (editor: UpdateServiceInput) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
}) => {
  const isApproved = editor.service.status === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-700">Service management</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Edit service</h2>
            <p className="mt-1 text-xs text-slate-500">Update the public information organizers use to evaluate your service.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close editor"
          >
            <IconX size={20} />
          </button>
        </div>

        <form
          className="space-y-5 px-5 py-6 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {isApproved && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>
                Saving changes to an approved service sends it back for admin verification and temporarily hides it from new marketplace requests. Existing bookings and reviews remain unchanged.
              </span>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Service name</span>
              <input
                value={editor.service_name}
                onChange={(event) => onChange({ ...editor, service_name: event.target.value })}
                required
                maxLength={255}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <label>
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <input
                value={editor.service_category}
                onChange={(event) => onChange({ ...editor, service_category: event.target.value })}
                required
                maxLength={255}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <label>
              <span className="text-xs font-semibold text-slate-700">Pricing unit</span>
              <input
                value={editor.pricing_unit}
                onChange={(event) => onChange({ ...editor, pricing_unit: event.target.value })}
                required
                maxLength={255}
                placeholder="event, day, hour or package"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Service description</span>
              <textarea
                value={editor.service_details}
                onChange={(event) => onChange({ ...editor, service_details: event.target.value })}
                required
                maxLength={1000}
                rows={5}
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{editor.service_details.length} / 1,000</span>
            </label>

            <label>
              <span className="text-xs font-semibold text-slate-700">Starting price (RM)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editor.pricing_starting_from}
                onChange={(event) => onChange({ ...editor, pricing_starting_from: event.target.value })}
                required
                className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </label>

            <label>
              <span className="text-xs font-semibold text-slate-700">Replacement portfolio</span>
              <span className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3.5 py-2.5 text-sm text-slate-600 transition hover:border-purple-300 hover:bg-purple-50/40">
                <IconUpload size={18} className="text-purple-700" />
                <span className="min-w-0 truncate">{editor.portfolio?.name ?? "Keep current portfolio"}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(event) => onChange({ ...editor, portfolio: event.target.files?.[0] ?? null })}
                />
              </span>
              <span className="mt-1 block text-[11px] text-slate-400">Optional · PDF, JPG or PNG · Maximum 10 MB</span>
            </label>

            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Pricing details</span>
              <textarea
                value={editor.pricing_description}
                onChange={(event) => onChange({ ...editor, pricing_description: event.target.value })}
                maxLength={500}
                rows={3}
                placeholder="Explain what is included in this starting price."
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800" role="alert">
              <IconAlertCircle size={17} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const VendorServices = () => {
  usePageTitle("My Services");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<UpdateServiceInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["vendor-services"],
    queryFn: fetchManagedServices,
    staleTime: 30_000,
  });

  const refreshServiceData = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["marketplace-services"] });
    queryClient.invalidateQueries({ queryKey: ["marketplace-service"] });
  };

  const updateMutation = useMutation({
    mutationFn: updateManagedService,
    onSuccess: () => {
      setEditor(null);
      setNotice("Service changes saved successfully.");
      refreshServiceData();
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: updateServiceVisibility,
    onSuccess: (service) => {
      setNotice(service.is_active ? "Service resumed in the marketplace." : "Service paused successfully.");
      refreshServiceData();
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: resubmitManagedService,
    onSuccess: () => {
      setNotice("Service resubmitted for admin verification.");
      refreshServiceData();
    },
  });

  const services = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.services ?? []).filter((service) => {
      const matchesFilter = filter === "all" || service.display_status === filter;
      const matchesSearch =
        !query ||
        service.service_name.toLowerCase().includes(query) ||
        service.service_category.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [data?.services, filter, search]);

  const filters: Array<{ value: ServiceFilter; label: string; count: number }> = [
    { value: "all", label: "All services", count: data?.summary.total ?? 0 },
    { value: "approved", label: "Active", count: data?.summary.active ?? 0 },
    { value: "paused", label: "Paused", count: data?.summary.paused ?? 0 },
    { value: "pending_verification", label: "Pending", count: data?.summary.pending ?? 0 },
    { value: "rejected", label: "Changes required", count: data?.summary.rejected ?? 0 },
  ];

  const openEditor = (service: ManagedService) => {
    setNotice(null);
    updateMutation.reset();
    setEditor({
      service,
      service_name: service.service_name,
      service_category: service.service_category,
      service_details: service.service_details,
      pricing_starting_from: String(service.pricing_starting_from),
      pricing_unit: service.pricing_unit,
      pricing_description: service.pricing_description ?? "",
      portfolio: null,
    });
  };

  if (isPending) {
    return <Loader title="My Services" message="Loading your service portfolio..." />;
  }

  const actionError = visibilityMutation.error
    ? apiErrorMessage(visibilityMutation.error, "The service visibility could not be updated.")
    : resubmitMutation.error
      ? apiErrorMessage(resubmitMutation.error, "The service could not be resubmitted.")
      : null;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-purple-700">
              <IconBriefcase size={17} /> Vendor workspace
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">My services</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Maintain your service information, marketplace visibility, verification status, and availability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/service/register")}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
          >
            <IconCirclePlus size={18} /> Add service
          </button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Service summary">
          {[
            { label: "Total services", value: data?.summary.total ?? 0, note: "Registered portfolio", color: "text-slate-950" },
            { label: "Active", value: data?.summary.active ?? 0, note: "Visible in marketplace", color: "text-emerald-700" },
            { label: "Pending review", value: data?.summary.pending ?? 0, note: "Awaiting verification", color: "text-amber-700" },
            { label: "Changes required", value: data?.summary.rejected ?? 0, note: "Needs your attention", color: "text-red-700" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${metric.color}`}>{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.note}</p>
            </div>
          ))}
        </section>

        {notice && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            <IconCheck size={19} className="mt-0.5 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold">Dismiss</button>
          </div>
        )}

        {actionError && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <IconAlertCircle size={19} className="shrink-0" /> {actionError}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-sm">
              <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search service or category"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {filters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
                    filter === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px]">{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          {isError ? (
            <div className="px-6 py-16 text-center">
              <IconAlertCircle size={26} className="mx-auto text-red-500" />
              <h2 className="mt-4 text-sm font-semibold text-slate-950">Services could not be loaded</h2>
              <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                <IconRefresh size={16} className={isFetching ? "animate-spin" : ""} /> Try again
              </button>
            </div>
          ) : services.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <IconBriefcase size={23} />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-slate-950">
                {(data?.summary.total ?? 0) === 0 ? "No services registered" : "No matching services"}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                {(data?.summary.total ?? 0) === 0
                  ? "Register your first service to begin the admin verification process."
                  : "Adjust the search term or filter to view other services."}
              </p>
              {(data?.summary.total ?? 0) === 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/service/register")}
                  className="mt-5 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Add your first service
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {services.map((service) => {
                const status = STATUS_META[service.display_status];
                const visibilityLoading = visibilityMutation.isPending && visibilityMutation.variables?.id === service.id;
                const resubmitLoading = resubmitMutation.isPending && resubmitMutation.variables === service.id;

                return (
                  <article key={service.id} className="p-5 transition hover:bg-slate-50/60 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200 sm:h-20 sm:w-20">
                          {isImagePortfolio(service.portfolio_url) ? (
                            <img src={service.portfolio_url ?? ""} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <IconBriefcase size={25} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <ServiceStatus status={service.display_status} />
                            <span className="text-[11px] text-slate-500">{status.description}</span>
                          </div>
                          <h2 className="mt-2 truncate text-lg font-semibold text-slate-950">{service.service_name}</h2>
                          <p className="mt-1 text-sm text-slate-500">{service.service_category}</p>
                          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">{service.service_details}</p>
                        </div>
                      </div>

                      <div className="shrink-0 xl:text-right">
                        <p className="text-lg font-semibold text-slate-950">{formatCurrency(service.pricing_starting_from)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">per {service.pricing_unit}</p>
                      </div>
                    </div>

                    {service.display_status === "rejected" && service.rejection_reason && (
                      <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Admin feedback</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-red-900">{service.rejection_reason}</p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <IconClipboardCheck size={16} className="text-slate-400" />
                          <strong className="font-semibold text-slate-800">{service.booking_count}</strong> bookings
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IconStar size={16} className="text-amber-500" />
                          <strong className="font-semibold text-slate-800">{service.rating_average ?? "New"}</strong>
                          {service.review_count > 0 && `(${service.review_count})`}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IconCalendarStats size={16} className="text-slate-400" />
                          <strong className="font-semibold text-slate-800">{service.available_dates_count}</strong> open dates
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {service.display_status === "approved" && (
                          <button
                            type="button"
                            onClick={() => navigate(`/marketplace/${service.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <IconExternalLink size={15} /> View live
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditor(service)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
                        >
                          <IconEdit size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/vendor/availability?service=${service.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
                        >
                          <IconCalendarStats size={15} /> Availability
                        </button>
                        {(service.display_status === "approved" || service.display_status === "paused") && (
                          <button
                            type="button"
                            onClick={() => visibilityMutation.mutate({ id: service.id, isActive: !service.is_active })}
                            disabled={visibilityLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {service.is_active ? <IconPlayerPause size={15} /> : <IconPlayerPlay size={15} />}
                            {visibilityLoading ? "Updating..." : service.is_active ? "Pause" : "Resume"}
                          </button>
                        )}
                        {service.display_status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => resubmitMutation.mutate(service.id)}
                            disabled={resubmitLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60"
                          >
                            <IconRefresh size={15} className={resubmitLoading ? "animate-spin" : ""} />
                            {resubmitLoading ? "Submitting..." : "Resubmit"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editor && (
        <EditServiceModal
          editor={editor}
          onChange={setEditor}
          onClose={() => {
            setEditor(null);
            updateMutation.reset();
          }}
          onSubmit={() => updateMutation.mutate(editor)}
          saving={updateMutation.isPending}
          error={updateMutation.error ? apiErrorMessage(updateMutation.error, "The service could not be updated.") : null}
        />
      )}
    </main>
  );
};

export default VendorServices;
