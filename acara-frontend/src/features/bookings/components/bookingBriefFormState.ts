export type BookingBriefFormValue = {
  event_title: string;
  event_type: string;
  venue_name: string;
  venue_address: string;
  start_time: string;
  end_time: string;
  guest_count: string;
  contact_name: string;
  contact_phone: string;
  setup_time: string;
  requirements: string;
  notes: string;
};

export type ReusableEventDetails = {
  event_title: string;
  event_type: string;
  venue_name: string;
  venue_address: string;
  start_time: string;
  end_time?: string | null;
  guest_count?: number | string | null;
  contact_name: string;
  contact_phone: string;
};

export const emptyBookingBrief = (): BookingBriefFormValue => ({
  event_title: "",
  event_type: "",
  venue_name: "",
  venue_address: "",
  start_time: "",
  end_time: "",
  guest_count: "",
  contact_name: "",
  contact_phone: "",
  setup_time: "",
  requirements: "",
  notes: "",
});

export const applyReusableEventDetails = (
  current: BookingBriefFormValue,
  source: ReusableEventDetails,
): BookingBriefFormValue => ({
  ...current,
  event_title: source.event_title,
  event_type: source.event_type,
  venue_name: source.venue_name,
  venue_address: source.venue_address,
  start_time: source.start_time,
  end_time: source.end_time ?? "",
  guest_count: source.guest_count == null ? "" : String(source.guest_count),
  contact_name: source.contact_name,
  contact_phone: source.contact_phone,
});

export const isBookingBriefValid = (value: BookingBriefFormValue) => {
  const required = [
    value.event_title,
    value.event_type,
    value.venue_name,
    value.venue_address,
    value.start_time,
    value.contact_name,
    value.contact_phone,
  ];
  const guestCountIsValid = value.guest_count === "" || Number(value.guest_count) >= 1;
  const timeRangeIsValid = value.end_time === "" || value.end_time > value.start_time;

  return required.every((field) => field.trim().length > 0) && guestCountIsValid && timeRangeIsValid;
};

export const bookingBriefPayload = (value: BookingBriefFormValue) => ({
  brief: {
    event_title: value.event_title.trim(),
    event_type: value.event_type.trim(),
    venue_name: value.venue_name.trim(),
    venue_address: value.venue_address.trim(),
    start_time: value.start_time,
    end_time: value.end_time || null,
    guest_count: value.guest_count ? Number(value.guest_count) : null,
    contact_name: value.contact_name.trim(),
    contact_phone: value.contact_phone.trim(),
    setup_time: value.setup_time || null,
    requirements: value.requirements.trim() || null,
  },
  notes: value.notes.trim() || null,
});
