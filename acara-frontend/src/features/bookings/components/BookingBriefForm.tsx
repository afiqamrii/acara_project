import type { ReactNode } from "react";
import type { BookingBriefFormValue } from "./bookingBriefFormState";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50";

const Label = ({ children, required = false }: { children: ReactNode; required?: boolean }) => (
  <span className="text-xs font-bold text-slate-700">
    {children}{required && <span className="ml-1 text-red-500">*</span>}
  </span>
);

const BookingBriefForm = ({
  value,
  onChange,
  selectedDate,
}: {
  value: BookingBriefFormValue;
  onChange: (value: BookingBriefFormValue) => void;
  selectedDate: string;
}) => {
  const update = (field: keyof BookingBriefFormValue, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-100 bg-purple-50/70 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Selected service date</p>
        <p className="mt-1 text-sm font-black text-purple-950">{formattedDate}</p>
        <p className="mt-1 text-xs leading-5 text-purple-700">These details will be shared with the vendor when you submit the booking.</p>
      </div>

      <section>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Event identity</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label>
            <Label required>Event title</Label>
            <input
              value={value.event_title}
              onChange={(event) => update("event_title", event.target.value)}
              maxLength={150}
              placeholder="e.g. Acara Annual Dinner"
              className={inputClass}
            />
          </label>
          <label>
            <Label required>Event type</Label>
            <input
              list="booking-event-types"
              value={value.event_type}
              onChange={(event) => update("event_type", event.target.value)}
              maxLength={100}
              placeholder="Select or enter an event type"
              className={inputClass}
            />
            <datalist id="booking-event-types">
              <option value="Wedding" />
              <option value="Corporate Event" />
              <option value="Birthday" />
              <option value="Engagement" />
              <option value="Conference" />
              <option value="Product Launch" />
              <option value="Private Celebration" />
            </datalist>
          </label>
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Schedule and venue</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <Label required>Start time</Label>
            <input type="time" value={value.start_time} onChange={(event) => update("start_time", event.target.value)} className={inputClass} />
          </label>
          <label>
            <Label>End time</Label>
            <input type="time" value={value.end_time} onChange={(event) => update("end_time", event.target.value)} className={inputClass} />
          </label>
          <label>
            <Label>Vendor setup time</Label>
            <input type="time" value={value.setup_time} onChange={(event) => update("setup_time", event.target.value)} className={inputClass} />
          </label>
          <label>
            <Label>Estimated guests</Label>
            <input
              type="number"
              min={1}
              max={100000}
              value={value.guest_count}
              onChange={(event) => update("guest_count", event.target.value)}
              placeholder="e.g. 250"
              className={inputClass}
            />
          </label>
        </div>
        {value.end_time && value.start_time && value.end_time <= value.start_time && (
          <p className="mt-2 text-xs font-medium text-red-500">End time must be later than the start time.</p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <Label required>Venue name</Label>
            <input
              value={value.venue_name}
              onChange={(event) => update("venue_name", event.target.value)}
              maxLength={150}
              placeholder="e.g. Grand Acara Ballroom"
              className={inputClass}
            />
          </label>
          <label>
            <Label required>Full venue address</Label>
            <input
              value={value.venue_address}
              onChange={(event) => update("venue_address", event.target.value)}
              maxLength={1000}
              placeholder="Street, town, state and postcode"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">On-the-day contact</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label>
            <Label required>Contact person</Label>
            <input
              value={value.contact_name}
              onChange={(event) => update("contact_name", event.target.value)}
              maxLength={150}
              placeholder="Full name"
              className={inputClass}
            />
          </label>
          <label>
            <Label required>Contact phone</Label>
            <input
              type="tel"
              value={value.contact_phone}
              onChange={(event) => update("contact_phone", event.target.value)}
              maxLength={30}
              placeholder="e.g. +60 12-345 6789"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Vendor instructions</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label>
            <Label>Service requirements</Label>
            <textarea
              value={value.requirements}
              onChange={(event) => update("requirements", event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Describe setup, equipment, menu, coverage or other service requirements..."
              className={`${inputClass} resize-none`}
            />
          </label>
          <label>
            <Label>Additional notes</Label>
            <textarea
              value={value.notes}
              onChange={(event) => update("notes", event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Anything else the vendor should know?"
              className={`${inputClass} resize-none`}
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default BookingBriefForm;
