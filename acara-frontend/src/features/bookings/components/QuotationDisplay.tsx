import type { Quotation } from "../api";

const statusMeta: Record<string, { label: string; className: string }> = {
  sent: { label: "Awaiting organizer", className: "border-amber-200 bg-amber-50 text-amber-700" },
  accepted: { label: "Accepted", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  declined: { label: "Declined", className: "border-red-200 bg-red-50 text-red-700" },
  revision_requested: { label: "Revision requested", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  expired: { label: "Expired", className: "border-slate-200 bg-slate-100 text-slate-600" },
  withdrawn: { label: "Withdrawn", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

const money = (value: number) => `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value?: string | null) => value
  ? new Date(value.replace(" ", "T")).toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
  : "-";

const QuotationDisplay = ({ quotation, compact = false }: { quotation?: Quotation | null; compact?: boolean }) => {
  if (!quotation) return null;
  const meta = statusMeta[quotation.status] ?? { label: quotation.status, className: "border-slate-200 bg-slate-50 text-slate-600" };

  if (compact) {
    return (
      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{quotation.reference}</p>
            <p className="mt-1 text-base font-black text-indigo-950">{money(quotation.total_amount)}</p>
            <p className="mt-0.5 text-xs text-indigo-600">Valid until {formatDateTime(quotation.valid_until)}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
        </div>
        {quotation.response_note && <p className="mt-2 line-clamp-2 text-xs leading-5 text-indigo-800">{quotation.response_note}</p>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-indigo-950 to-purple-900 px-4 py-4 text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Quotation · Version {quotation.version}</p>
          <h3 className="mt-1 text-lg font-black">{quotation.reference}</h3>
          <p className="mt-1 text-xs text-indigo-200">Sent {formatDateTime(quotation.sent_at)} · Valid until {formatDateTime(quotation.valid_until)}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
          <p className="mt-2 text-xl font-black">{money(quotation.total_amount)}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr><th className="pb-2">Item</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit price</th><th className="pb-2 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 font-semibold text-slate-800">{item.description}</td>
                  <td className="py-2.5 text-right text-slate-500">{item.quantity}</td>
                  <td className="py-2.5 text-right text-slate-500">{money(item.unit_price)}</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-4 max-w-xs space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(quotation.subtotal)}</span></div>
          {quotation.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>- {money(quotation.discount_amount)}</span></div>}
          {quotation.tax_amount > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({quotation.tax_rate}%)</span><span>{money(quotation.tax_amount)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900"><span>Total</span><span>{money(quotation.total_amount)}</span></div>
        </div>

        {(quotation.vendor_notes || quotation.terms || quotation.response_note) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quotation.vendor_notes && <div className="rounded-xl bg-indigo-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Vendor message</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-indigo-900">{quotation.vendor_notes}</p></div>}
            {quotation.terms && <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terms</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{quotation.terms}</p></div>}
            {quotation.response_note && <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3 sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Organizer response</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{quotation.response_note}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationDisplay;
