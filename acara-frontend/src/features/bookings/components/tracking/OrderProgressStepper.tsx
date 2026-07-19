import type { ReactNode } from "react";
import { IconAlertTriangle, IconBan, IconClockPause } from "@tabler/icons-react";
import type { OrderTrackingResult } from "../../utils/orderTracking";

const formatTimestamp = (value: string | null) => {
  if (!value) return null;
  return new Date(value.replace(" ", "T")).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const BANNER_STYLES: Record<string, { wrap: string; icon: ReactNode }> = {
  cancelled: { wrap: "border-red-200 bg-red-50 text-red-800", icon: <IconBan size={18} className="text-red-600" /> },
  rejected: { wrap: "border-orange-200 bg-orange-50 text-orange-800", icon: <IconBan size={18} className="text-orange-600" /> },
  expired: { wrap: "border-slate-200 bg-slate-100 text-slate-700", icon: <IconClockPause size={18} className="text-slate-500" /> },
  disputed: { wrap: "border-amber-200 bg-amber-50 text-amber-800", icon: <IconAlertTriangle size={18} className="text-amber-600" /> },
};

const OrderProgressStepper = ({ tracking }: { tracking: OrderTrackingResult }) => {
  if (!tracking.active) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {tracking.banner && (
        <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 ${BANNER_STYLES[tracking.banner.tone].wrap}`}>
          {BANNER_STYLES[tracking.banner.tone].icon}
          <div>
            <p className="text-sm font-black">{tracking.banner.title}</p>
            <p className="mt-0.5 text-xs leading-5">{tracking.banner.description}</p>
          </div>
        </div>
      )}

      {/* Desktop / tablet: full horizontal stepper */}
      <ol className="hidden gap-1 sm:flex">
        {tracking.steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === tracking.steps.length - 1;
          const circleClass =
            step.state === "done"
              ? "bg-emerald-500 text-white"
              : step.state === "current"
                ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                : step.state === "skipped"
                  ? "bg-slate-100 text-slate-300"
                  : "bg-slate-100 text-slate-400";
          const lineClass = step.state === "done" ? "bg-emerald-400" : "bg-slate-200";
          const timestamp = formatTimestamp(step.timestamp);

          return (
            <li key={step.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${circleClass}`}>
                  <Icon size={17} stroke={2.2} />
                </span>
                {!isLast && <span className={`mx-1 h-0.5 flex-1 rounded ${lineClass}`} />}
              </div>
              <p className={`mt-2 px-1 text-[11px] font-bold leading-tight ${step.state === "upcoming" || step.state === "skipped" ? "text-slate-400" : "text-slate-800"}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{timestamp ?? (step.state === "current" ? "In progress" : "")}</p>
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact current-step summary + slim progress bar */}
      <div className="sm:hidden">
        {(() => {
          const currentStep = tracking.steps[Math.max(tracking.currentStageIndex, 0)];
          const Icon = currentStep.icon;
          const percent = Math.round((Math.max(tracking.currentStageIndex, 0) / (tracking.steps.length - 1)) * 100);

          return (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Icon size={18} stroke={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Step {Math.max(tracking.currentStageIndex, 0) + 1} of {tracking.steps.length}
                  </p>
                  <p className="truncate text-sm font-black text-slate-900">{currentStep.label}</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default OrderProgressStepper;
