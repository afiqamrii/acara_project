import {
  IconCircleCheck,
  IconClipboardList,
  IconPackage,
  IconTruckDelivery,
  IconMapPin,
  IconFileCheck,
  IconChecks,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { BookingItem, TrackingStage } from "../api";

export type TrackingRole = "customer" | "vendor" | "admin";

export type StepState = "done" | "current" | "upcoming" | "skipped";

export type TrackingStep = {
  key: string;
  label: string;
  description: string;
  icon: Icon;
  state: StepState;
  timestamp: string | null;
};

export type TrackingBanner = {
  tone: "cancelled" | "rejected" | "expired" | "disputed";
  title: string;
  description: string;
};

export type MainActionKind =
  | "message"
  | "confirm_completion"
  | "review"
  | "browse"
  | "advance_stage"
  | "submit_completion"
  | "none";

export type MainAction = {
  label: string;
  kind: MainActionKind;
  stage?: TrackingStage;
  disabled?: boolean;
};

export type OrderTrackingResult = {
  active: boolean;
  steps: TrackingStep[];
  banner: TrackingBanner | null;
  currentStageIndex: number;
  nextVendorStage: TrackingStage | null;
  nextVendorStageAvailable: boolean;
  eventDateReached: boolean;
};

export const STAGE_ORDER: TrackingStage[] = ["vendor_preparing", "ready_for_event", "on_the_way", "arrived"];

// "On the Way" and "Arrived" describe same-day activity, so they can't be marked before the event date —
// mirrors the existing completion-submission rule (BookingCompletionController rejects early submissions).
const DATE_GATED_STAGES: TrackingStage[] = ["on_the_way", "arrived"];

const isEventDateReached = (selectedDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${selectedDate}T00:00:00`).getTime() <= today.getTime();
};

export const STAGE_LABELS: Record<TrackingStage, string> = {
  vendor_preparing: "Vendor Preparing",
  ready_for_event: "Ready for Event",
  on_the_way: "On the Way / Setup Started",
  arrived: "Arrived / Service Started",
};

const STEP_DEFS: Array<{ key: string; label: string; description: string; icon: Icon }> = [
  { key: "confirmed", label: "Booking Confirmed", description: "The vendor accepted the booking and the event date is locked.", icon: IconCircleCheck },
  { key: "vendor_preparing", label: "Vendor Preparing", description: "The vendor is preparing everything needed for your event.", icon: IconClipboardList },
  { key: "ready_for_event", label: "Ready for Event", description: "Preparations are complete and the vendor is ready to go.", icon: IconPackage },
  { key: "on_the_way", label: "On the Way / Setup Started", description: "The vendor is heading to the venue or starting setup.", icon: IconTruckDelivery },
  { key: "arrived", label: "Arrived / Service Started", description: "The vendor has arrived and service delivery has begun.", icon: IconMapPin },
  { key: "completion_submitted", label: "Completion Submitted", description: "The vendor submitted proof that the service was delivered.", icon: IconFileCheck },
  { key: "completed", label: "Completed", description: "The organizer confirmed the service was delivered as agreed.", icon: IconChecks },
];

const isTerminal = (status: string) => status === "cancelled" || status === "rejected" || status === "expired";

export const computeOrderTracking = (booking: BookingItem): OrderTrackingResult => {
  const status = booking.status;
  const active = Boolean(booking.confirmed_at);

  if (!active) {
    return {
      active: false,
      steps: [],
      banner: null,
      currentStageIndex: -1,
      nextVendorStage: null,
      nextVendorStageAvailable: false,
      eventDateReached: false,
    };
  }

  const eventDateReached = isEventDateReached(booking.selected_date);

  const trackingUpdates = booking.tracking_updates ?? [];
  const latestStageIndex = trackingUpdates.length
    ? STAGE_ORDER.indexOf(trackingUpdates[trackingUpdates.length - 1].stage)
    : -1;

  let currentIndex = 0;
  if (latestStageIndex >= 0) currentIndex = 1 + latestStageIndex;
  if (booking.completion || status === "completion_pending" || status === "completion_disputed") {
    currentIndex = Math.max(currentIndex, 5);
  }
  if (status === "completed") currentIndex = 6;

  const banner: TrackingBanner | null =
    status === "cancelled"
      ? {
          tone: "cancelled",
          title: "Booking Cancelled",
          description: booking.cancellation_reason
            ? `Cancelled by ${booking.cancelled_by === "vendor" ? "the vendor" : "the organizer"}: ${booking.cancellation_reason}`
            : "This booking was cancelled.",
        }
      : status === "rejected"
        ? { tone: "rejected", title: "Request Declined", description: booking.rejection_reason || "The vendor declined this booking request." }
        : status === "expired"
          ? { tone: "expired", title: "Request Expired", description: "The response deadline passed before this booking could proceed." }
          : status === "completion_disputed"
            ? { tone: "disputed", title: "Dispute Under Review", description: "An administrator is reviewing the reported completion issue." }
            : null;

  const steps: TrackingStep[] = STEP_DEFS.map((def, index) => {
    let state: StepState = "upcoming";
    if (isTerminal(status)) {
      state = index <= currentIndex ? "done" : "skipped";
    } else if (index < currentIndex) {
      state = "done";
    } else if (index === currentIndex) {
      state = "current";
    }

    let timestamp: string | null = null;
    if (def.key === "confirmed") timestamp = booking.confirmed_at ?? null;
    else if (def.key === "completion_submitted") timestamp = booking.completion?.submitted_at ?? null;
    else if (def.key === "completed") timestamp = booking.completed_at ?? null;
    else {
      timestamp = trackingUpdates.find((update) => update.stage === def.key)?.created_at ?? null;
    }

    return { ...def, state, timestamp };
  });

  const nextVendorStage: TrackingStage | null =
    status === "confirmed" ? (STAGE_ORDER[latestStageIndex + 1] ?? null) : null;
  const nextVendorStageAvailable = nextVendorStage
    ? !DATE_GATED_STAGES.includes(nextVendorStage) || eventDateReached
    : false;

  return {
    active: true,
    steps,
    banner,
    currentStageIndex: currentIndex,
    nextVendorStage,
    nextVendorStageAvailable,
    eventDateReached,
  };
};

export const resolveMainAction = (
  booking: BookingItem,
  role: TrackingRole,
  tracking: OrderTrackingResult,
): MainAction | null => {
  if (!tracking.active) return null;
  const status = booking.status;

  if (role === "customer") {
    if (isTerminal(status)) return { label: "Browse Similar Vendors", kind: "browse" };
    if (status === "completion_pending") return { label: "Confirm Completion", kind: "confirm_completion" };
    if (status === "completion_disputed") return { label: "Awaiting Admin Resolution", kind: "none", disabled: true };
    if (status === "completed") return { label: "Write a Review", kind: "review" };
    return { label: "Message Vendor", kind: "message" };
  }

  if (role === "vendor") {
    if (isTerminal(status) || status === "completed") return null;
    if (status === "completion_pending") return { label: "Awaiting Organizer Confirmation", kind: "none", disabled: true };
    if (status === "completion_disputed") return { label: "Awaiting Admin Resolution", kind: "none", disabled: true };
    if (tracking.nextVendorStage) {
      if (!tracking.nextVendorStageAvailable) {
        return { label: `Available on Event Day (${STAGE_LABELS[tracking.nextVendorStage]})`, kind: "none", disabled: true };
      }
      return { label: `Mark ${STAGE_LABELS[tracking.nextVendorStage]}`, kind: "advance_stage", stage: tracking.nextVendorStage };
    }
    if (!tracking.eventDateReached) return { label: "Awaiting Event Day", kind: "none", disabled: true };
    return { label: "Submit Completion", kind: "submit_completion" };
  }

  return null;
};

export type ActorRole = "system" | "vendor" | "customer" | "admin";

const ACTIVITY_ACTOR_BY_TYPE: Record<string, ActorRole> = {
  submitted: "customer",
  reminder: "system",
  confirmed: "customer",
  rejected: "vendor",
  expired: "system",
  completed: "system",
  quotation_sent: "vendor",
  quotation_accepted: "customer",
  quotation_revision_requested: "customer",
  quotation_declined: "customer",
  quotation_expired: "system",
  completion_submitted: "vendor",
  completion_confirmed: "customer",
  completion_auto_confirmed: "system",
  completion_disputed: "customer",
  completion_resolved_completed: "admin",
  completion_resolved_reopened: "admin",
  reschedule_requested: "customer",
  reschedule_approved: "vendor",
  reschedule_rejected: "vendor",
  reschedule_withdrawn: "customer",
};

export type MergedTimelineEntry = {
  key: string;
  label: string;
  description: string;
  occurred_at: string;
  actor: ActorRole;
  photoUrl?: string | null;
  mapUrl?: string | null;
};

export const mergeTrackingTimeline = (booking: BookingItem): MergedTimelineEntry[] => {
  const activityEntries: MergedTimelineEntry[] = (booking.timeline ?? []).map((event) => ({
    key: `activity-${event.type}-${event.occurred_at}`,
    label: event.label,
    description: event.description,
    occurred_at: event.occurred_at,
    actor:
      event.type === "cancelled"
        ? booking.cancelled_by === "vendor"
          ? "vendor"
          : "customer"
        : ACTIVITY_ACTOR_BY_TYPE[event.type] ?? "system",
  }));

  const stageEntries: MergedTimelineEntry[] = (booking.tracking_updates ?? []).map((update) => ({
    key: `stage-${update.id}`,
    label: update.label,
    description: update.note || `The vendor updated the tracking stage to "${update.label}".`,
    occurred_at: update.created_at,
    actor: (update.actor?.role as ActorRole) ?? "vendor",
    photoUrl: update.photo_url ?? null,
    mapUrl:
      update.latitude != null && update.longitude != null
        ? `https://www.google.com/maps?q=${update.latitude},${update.longitude}`
        : null,
  }));

  return [...activityEntries, ...stageEntries].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
};
