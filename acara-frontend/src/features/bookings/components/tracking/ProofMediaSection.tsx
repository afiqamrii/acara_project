import { IconPhoto, IconFileTypePdf, IconExternalLink } from "@tabler/icons-react";
import type { BookingItem } from "../../api";

const isPdf = (name?: string | null, url?: string | null) => {
  const target = (name || url || "").toLowerCase();
  return target.endsWith(".pdf");
};

const ProofMediaSection = ({ booking }: { booking: BookingItem }) => {
  const completion = booking.completion;
  const hasProof = Boolean(completion?.proof_url);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Service listing</p>
        <div className="mt-3 aspect-video w-full bg-slate-100">
          {booking.portfolio_url ? (
            <img src={booking.portfolio_url} alt={booking.service_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <IconPhoto size={32} />
            </div>
          )}
        </div>
        <p className="p-4 text-sm font-semibold text-slate-700">{booking.service_name}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Completion proof</p>
        {hasProof ? (
          isPdf(completion?.proof_name, completion?.proof_url) ? (
            <a
              href={completion?.proof_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="mx-4 mt-3 mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <IconFileTypePdf size={22} className="shrink-0 text-red-500" />
                <span className="truncate text-sm font-semibold text-slate-700">{completion?.proof_name || "Proof document"}</span>
              </span>
              <IconExternalLink size={16} className="shrink-0 text-slate-400" />
            </a>
          ) : (
            <a href={completion?.proof_url ?? undefined} target="_blank" rel="noreferrer" className="mt-3 block aspect-video w-full bg-slate-100">
              <img src={completion?.proof_url ?? undefined} alt="Completion proof" className="h-full w-full object-cover" />
            </a>
          )
        ) : (
          <div className="mx-4 my-3 flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="px-4 text-xs font-semibold text-slate-400">No proof uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofMediaSection;
