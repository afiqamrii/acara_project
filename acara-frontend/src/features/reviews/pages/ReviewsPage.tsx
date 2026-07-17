import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconMessageStar,
  IconShoppingBag,
  IconStar,
} from "@tabler/icons-react";
import type { AxiosError } from "axios";
import Loader from "../../../components/common/Loader";
import { usePageTitle } from "../../../utils/usePageTitle";
import {
  fetchReviewableBookings,
  saveReview,
  type ReviewableBooking,
  type SaveReviewInput,
} from "../api";

type ReviewFilter = "all" | "awaiting" | "reviewed";

type EditorState = {
  bookingId: number;
  reviewId?: number;
  rating: number;
  comment: string;
};

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  iconClassName: string;
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatTimestamp = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const RatingStars = ({ rating, size = 18 }: { rating: number; size?: number }) => (
  <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <IconStar
        key={star}
        size={size}
        className={
          star <= rating
            ? "fill-amber-400 text-amber-400"
            : "fill-slate-100 text-slate-200"
        }
      />
    ))}
  </span>
);

const StarPicker = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => (
  <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Overall rating">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        role="radio"
        aria-checked={value === star}
        aria-label={`${star} star${star === 1 ? "" : "s"}`}
        onClick={() => onChange(star)}
        className="rounded-md p-1 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        <IconStar
          size={29}
          className={
            star <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-white text-slate-300"
          }
        />
      </button>
    ))}
    <span className="ml-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {value}.0 / 5.0
    </span>
  </div>
);

const MetricCard = ({
  label,
  value,
  description,
  icon,
  iconClassName,
}: MetricCardProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
        {icon}
      </span>
    </div>
  </div>
);

const ReviewsPage = () => {
  usePageTitle("Reviews");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: fetchReviewableBookings,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (input: SaveReviewInput) => saveReview(input),
    onSuccess: (_review, input) => {
      setEditor(null);
      setNotice(input.reviewId ? "Your review was updated successfully." : "Your review was published successfully.");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-services"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-service"] });
    },
  });

  const bookings = useMemo(() => {
    const items = data?.bookings ?? [];
    if (filter === "awaiting") return items.filter((booking) => !booking.review);
    if (filter === "reviewed") return items.filter((booking) => booking.review);
    return items;
  }, [data?.bookings, filter]);

  const filterOptions: Array<{ value: ReviewFilter; label: string; count: number }> = [
    { value: "all", label: "All records", count: data?.summary.total ?? 0 },
    { value: "awaiting", label: "Awaiting review", count: data?.summary.awaiting_review ?? 0 },
    { value: "reviewed", label: "Published", count: data?.summary.reviewed ?? 0 },
  ];

  const reviewedPercentage = data?.summary.total
    ? Math.round((data.summary.reviewed / data.summary.total) * 100)
    : 0;

  const openEditor = (booking: ReviewableBooking) => {
    setNotice(null);
    mutation.reset();
    setEditor({
      bookingId: booking.booking_id,
      reviewId: booking.review?.id,
      rating: booking.review?.rating ?? 5,
      comment: booking.review?.comment ?? "",
    });
  };

  const errorMessage = (() => {
    if (!mutation.error) return null;
    const error = mutation.error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
    const validationError = Object.values(error.response?.data?.errors ?? {})[0]?.[0];
    return validationError ?? error.response?.data?.message ?? "The review could not be saved.";
  })();

  if (isPending) {
    return <Loader title="Reviews" message="Loading completed bookings..." />;
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-purple-700">
              <IconMessageStar size={17} stroke={2} />
              Account activity
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Reviews & ratings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage verified feedback for services completed through Acara. Your reviews help other
              organizers make informed vendor decisions.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm shadow-slate-200/40">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-600">Review completion</span>
              <span className="text-xs font-semibold text-slate-900">{reviewedPercentage}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-purple-700 transition-all"
                style={{ width: `${reviewedPercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data?.summary.reviewed ?? 0} of {data?.summary.total ?? 0} completed services reviewed
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Review summary">
          <MetricCard
            label="Eligible services"
            value={data?.summary.total ?? 0}
            description="Completed bookings available in your review history"
            icon={<IconShoppingBag size={21} />}
            iconClassName="bg-slate-100 text-slate-700"
          />
          <MetricCard
            label="Awaiting review"
            value={data?.summary.awaiting_review ?? 0}
            description="Completed services that still require your feedback"
            icon={<IconClock size={21} />}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <MetricCard
            label="Published reviews"
            value={data?.summary.reviewed ?? 0}
            description="Verified reviews currently visible on the marketplace"
            icon={<IconCheck size={21} />}
            iconClassName="bg-emerald-50 text-emerald-700"
          />
        </section>

        {notice && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
            <IconCheck size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Review saved</p>
              <p className="mt-0.5 text-emerald-800">{notice}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Review activity</h2>
              <p className="mt-1 text-sm text-slate-500">View and manage feedback for your completed bookings.</p>
            </div>
            <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 lg:w-auto" aria-label="Review filters">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex min-w-max items-center justify-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition ${
                    filter === option.value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === option.value ? "bg-purple-50 text-purple-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isError ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <IconAlertCircle size={22} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-950">Reviews could not be loaded</h3>
              <p className="mt-1 text-sm text-slate-500">There was a problem retrieving your review history.</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isFetching ? "Retrying..." : "Try again"}
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <IconCheck size={22} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-950">
                {filter === "all" ? "No completed services yet" : "No records in this view"}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                {filter === "all"
                  ? "Completed bookings will appear here when they become eligible for verified feedback."
                  : "Select another filter to view the rest of your review activity."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {bookings.map((booking) => {
                const isEditing = editor?.bookingId === booking.booking_id;

                return (
                  <article key={booking.booking_id} className="px-5 py-6 transition hover:bg-slate-50/60 sm:px-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {booking.booking_reference}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span className="text-xs text-slate-500">Completed {formatDate(booking.selected_date)}</span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">{booking.service_name}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Service provider <span className="font-medium text-slate-800">{booking.vendor_name}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            booking.review
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              booking.review ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {booking.review ? "Published" : "Awaiting review"}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/marketplace/${booking.service_id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 transition hover:text-purple-700"
                        >
                          View service <IconChevronRight size={15} />
                        </button>
                      </div>
                    </div>

                    {isEditing && editor ? (
                      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="border-b border-slate-200 pb-4">
                          <h4 className="text-sm font-semibold text-slate-950">
                            {editor.reviewId ? "Edit published review" : "Submit a verified review"}
                          </h4>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Provide an honest assessment of service quality, communication, and delivery.
                          </p>
                        </div>

                        <div className="mt-5">
                          <label className="mb-2 block text-xs font-semibold text-slate-700">
                            Overall rating <span className="text-red-500">*</span>
                          </label>
                          <StarPicker
                            value={editor.rating}
                            onChange={(rating) => setEditor({ ...editor, rating })}
                          />
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor={`review-comment-${booking.booking_id}`} className="text-xs font-semibold text-slate-700">
                              Review comments <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-slate-400">{editor.comment.length} / 2,000</span>
                          </div>
                          <textarea
                            id={`review-comment-${booking.booking_id}`}
                            value={editor.comment}
                            onChange={(event) => setEditor({ ...editor, comment: event.target.value })}
                            rows={5}
                            maxLength={2000}
                            placeholder="Describe your experience with this vendor and the service delivered..."
                            className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                          />
                          <p className={`mt-1.5 text-[11px] ${editor.comment.trim().length < 10 ? "text-amber-700" : "text-slate-500"}`}>
                            A minimum of 10 characters is required.
                          </p>
                        </div>

                        {errorMessage && (
                          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800" role="alert">
                            <IconAlertCircle size={17} className="shrink-0" />
                            <span>{errorMessage}</span>
                          </div>
                        )}

                        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditor(null);
                              mutation.reset();
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => mutation.mutate(editor)}
                            disabled={mutation.isPending || editor.comment.trim().length < 10}
                            className="rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {mutation.isPending ? "Saving review..." : editor.reviewId ? "Save changes" : "Publish review"}
                          </button>
                        </div>
                      </div>
                    ) : booking.review ? (
                      <div className="mt-5 border-l-2 border-purple-200 pl-4 sm:pl-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-3">
                            <RatingStars rating={booking.review.rating} />
                            <span className="text-xs text-slate-500">
                              Published {formatTimestamp(booking.review.created_at)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditor(booking)}
                            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-purple-700 transition hover:text-purple-900"
                          >
                            <IconEdit size={15} /> Edit review
                          </button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {booking.review.comment}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                            <IconStar size={19} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Your feedback is pending</p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                              Share a verified review to help other organizers evaluate this service.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditor(booking)}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                        >
                          <IconMessageStar size={17} /> Write review
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          Reviews are linked to completed Acara bookings and displayed as verified feedback.
        </p>
      </div>
    </main>
  );
};

export default ReviewsPage;
