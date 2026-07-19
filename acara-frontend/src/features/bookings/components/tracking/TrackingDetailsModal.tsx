import { motion } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import type { BookingItem } from "../../api";
import ProofMediaSection from "./ProofMediaSection";
import OrderTrackingTimeline from "./OrderTrackingTimeline";

const TrackingDetailsModal = ({ booking, onClose }: { booking: BookingItem; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Order tracking</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Full tracking details</h2>
          <p className="mt-1 text-sm text-slate-500">Service media, completion proof, and the complete update history.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <IconX size={20} />
        </button>
      </div>

      <div className="space-y-5">
        <ProofMediaSection booking={booking} />
        <OrderTrackingTimeline booking={booking} />
      </div>
    </motion.div>
  </motion.div>
);

export default TrackingDetailsModal;
