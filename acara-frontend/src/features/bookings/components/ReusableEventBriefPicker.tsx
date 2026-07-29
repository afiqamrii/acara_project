import { useMemo, useState } from "react";
import { CalendarCheck2, Check, Copy, MapPin, Users } from "lucide-react";
import type { BookingBrief } from "../api";
import type { CartItem } from "../../header/pages/cartApi";

type ReusableEventBriefPickerProps = {
  items: CartItem[];
  selectedDate: string;
  isLoading: boolean;
  isError: boolean;
  onApply: (brief: BookingBrief) => void;
};

const ReusableEventBriefPicker = ({
  items,
  selectedDate,
  isLoading,
  isError,
  onApply,
}: ReusableEventBriefPickerProps) => {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [appliedItemId, setAppliedItemId] = useState<number | null>(null);

  const candidates = useMemo(() => {
    const uniqueEvents = new Map<string, CartItem>();

    items
      .filter((item) => item.selected_date === selectedDate && item.brief)
      .forEach((item) => {
        const key = [
          item.brief?.event_title.trim().toLowerCase(),
          item.brief?.venue_name.trim().toLowerCase(),
          item.selected_date,
        ].join("|");

        if (!uniqueEvents.has(key)) {
          uniqueEvents.set(key, item);
        }
      });

    return Array.from(uniqueEvents.values());
  }, [items, selectedDate]);

  const effectiveSelectedId =
    selectedItemId && candidates.some((item) => item.id === selectedItemId)
      ? selectedItemId
      : candidates[0]?.id ?? null;
  const selectedItem = candidates.find((item) => item.id === effectiveSelectedId) ?? null;

  if (isLoading) {
    return (
      <div className="mb-5 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="h-3 w-36 rounded bg-slate-200" />
        <div className="mt-3 h-10 rounded-xl bg-slate-200/80" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Your saved event details could not be loaded. You can still complete the form manually.
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-purple-600 shadow-sm">
            <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black text-purple-950">Booking several services?</p>
            <p className="mt-1 text-xs leading-5 text-purple-700">
              Add the first service to your cart. When you choose another service for this same date,
              Acara will offer its event details here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-purple-600 p-2 text-white shadow-sm shadow-purple-200">
          <Copy className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-purple-950">Reuse event details</p>
          <p className="mt-1 text-xs leading-5 text-purple-700">
            We found an event in your cart for this date. Copy its shared details, then add instructions
            for this service.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Choose an event to reuse</span>
          <select
            value={effectiveSelectedId ?? ""}
            onChange={(event) => {
              setSelectedItemId(Number(event.target.value));
              setAppliedItemId(null);
            }}
            className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
          >
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brief?.event_title} · {item.brief?.venue_name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (!selectedItem?.brief) return;
            onApply(selectedItem.brief);
            setAppliedItemId(selectedItem.id);
          }}
          disabled={!selectedItem}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {appliedItemId === selectedItem?.id ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Details applied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Use these details
            </>
          )}
        </button>
      </div>

      {selectedItem?.brief && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
            {selectedItem.brief.venue_name}
          </span>
          {selectedItem.brief.guest_count && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
              {selectedItem.brief.guest_count.toLocaleString()} guests
            </span>
          )}
          <span>From {selectedItem.service_name}</span>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-4 text-slate-500">
        Setup time, service requirements and notes are kept separate for each vendor.
      </p>
    </div>
  );
};

export default ReusableEventBriefPicker;
