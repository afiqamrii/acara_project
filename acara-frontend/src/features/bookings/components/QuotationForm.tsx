import {
  quotationTotals,
  type QuotationFormItem,
  type QuotationFormValue,
} from "./quotationFormState";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50";

const money = (value: number) => `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const QuotationForm = ({
  value,
  onChange,
  eventDate,
}: {
  value: QuotationFormValue;
  onChange: (value: QuotationFormValue) => void;
  eventDate: string;
}) => {
  const totals = quotationTotals(value);
  const updateItem = (index: number, field: keyof QuotationFormItem, fieldValue: string) => {
    onChange({
      ...value,
      items: value.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: fieldValue } : item),
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Itemized pricing</p>
            <p className="mt-1 text-xs text-slate-500">Totals are recalculated and verified by the server.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...value, items: [...value.items, { description: "", quantity: "1", unit_price: "" }] })}
            disabled={value.items.length >= 30}
            className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            + Add item
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {value.items.map((item, index) => {
            const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
            return (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_100px_140px_110px_36px] sm:items-end">
                <label>
                  <span className="text-xs font-bold text-slate-700">Description</span>
                  <input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} maxLength={255} placeholder="Service or deliverable" className={inputClass} />
                </label>
                <label>
                  <span className="text-xs font-bold text-slate-700">Quantity</span>
                  <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className={inputClass} />
                </label>
                <label>
                  <span className="text-xs font-bold text-slate-700">Unit price (RM)</span>
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, "unit_price", event.target.value)} className={inputClass} />
                </label>
                <div className="pb-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{money(amount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, items: value.items.filter((_, itemIndex) => itemIndex !== index) })}
                  disabled={value.items.length === 1}
                  className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove quotation item"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-bold text-slate-700">Discount (RM)</span>
              <input type="number" min="0" step="0.01" value={value.discount_amount} onChange={(event) => onChange({ ...value, discount_amount: event.target.value })} className={inputClass} />
              {totals.discount > totals.subtotal && <span className="mt-1 block text-xs text-red-500">Discount cannot exceed subtotal.</span>}
            </label>
            <label>
              <span className="text-xs font-bold text-slate-700">Tax rate (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={value.tax_rate} onChange={(event) => onChange({ ...value, tax_rate: event.target.value })} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Valid until</span>
            <input type="date" max={eventDate} value={value.valid_until} onChange={(event) => onChange({ ...value, valid_until: event.target.value })} className={inputClass} />
            <span className="mt-1 block text-xs text-slate-400">Must not pass the event date.</span>
          </label>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quotation total</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3 text-slate-300"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex justify-between gap-3 text-slate-300"><span>Discount</span><span>- {money(totals.discount)}</span></div>
            <div className="flex justify-between gap-3 text-slate-300"><span>Tax ({Number(value.tax_rate) || 0}%)</span><span>{money(totals.tax)}</span></div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
            <span className="text-xl font-black">{money(totals.total)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-xs font-bold text-slate-700">Terms and conditions</span>
          <textarea value={value.terms} onChange={(event) => onChange({ ...value, terms: event.target.value })} maxLength={2000} rows={4} placeholder="Deposit, scheduling, inclusions or service terms..." className={`${inputClass} resize-none`} />
        </label>
        <label>
          <span className="text-xs font-bold text-slate-700">Message to organizer</span>
          <textarea value={value.vendor_notes} onChange={(event) => onChange({ ...value, vendor_notes: event.target.value })} maxLength={2000} rows={4} placeholder="Explain the package or important assumptions..." className={`${inputClass} resize-none`} />
        </label>
      </section>
    </div>
  );
};

export default QuotationForm;
