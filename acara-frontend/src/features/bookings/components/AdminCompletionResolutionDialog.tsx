import { motion } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { BookingItem } from "../api";

export type ResolutionAction = "complete" | "reopen";

const AdminCompletionResolutionDialog = ({
  booking,
  action,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  booking: BookingItem;
  action: ResolutionAction;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
  error?: string;
}) => {
  const [reason, setReason] = useState("");
  const completesBooking = action === "complete";
  const canSubmit = reason.trim().length >= 10 && !submitting;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-resolution-title"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Admin resolution</p>
            <h2 id="admin-resolution-title" className="mt-2 text-xl font-black text-slate-900">
              {completesBooking ? "Approve completion" : "Return completion to vendor"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{booking.service_name} · {booking.booking_reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close resolution dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <IconX size={18} />
          </button>
        </div>

        <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${completesBooking ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-orange-100 bg-orange-50 text-orange-900"}`}>
          {completesBooking
            ? "This verifies the vendor submission, closes the booking, and unlocks organizer review."
            : "This reopens the confirmed booking so the vendor can resolve the issue and submit completion again."}
        </p>

        <label className="mt-5 block">
          <span className="flex items-center justify-between text-xs font-bold text-slate-700">
            Resolution reason
            <span className="font-medium text-slate-400">{reason.length}/2000</span>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Record the evidence reviewed and explain this decision..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <span className="mt-1 block text-xs text-red-500">Please enter at least 10 characters.</span>
          )}
        </label>

        {error && <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(reason.trim())}
            disabled={!canSubmit}
            className={`flex-1 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-bold text-white disabled:opacity-50 ${completesBooking ? "from-emerald-600 to-teal-600" : "from-orange-500 to-amber-600"}`}
          >
            {submitting ? "Resolving..." : completesBooking ? "Approve & Complete" : "Return to Vendor"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminCompletionResolutionDialog;
