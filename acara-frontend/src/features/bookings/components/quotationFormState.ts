import type { Quotation, QuotationPayload } from "../api";

export type QuotationFormItem = {
  description: string;
  quantity: string;
  unit_price: string;
};

export type QuotationFormValue = {
  items: QuotationFormItem[];
  discount_amount: string;
  tax_rate: string;
  terms: string;
  vendor_notes: string;
  valid_until: string;
};

const dateIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const emptyQuotationForm = (
  serviceName: string,
  startingPrice: number,
  eventDate: string,
): QuotationFormValue => {
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 7);
  const suggestedIso = dateIso(suggested);

  return {
    items: [{
      description: serviceName,
      quantity: "1",
      unit_price: startingPrice ? String(startingPrice) : "",
    }],
    discount_amount: "0",
    tax_rate: "0",
    terms: "",
    vendor_notes: "",
    valid_until: suggestedIso < eventDate ? suggestedIso : eventDate,
  };
};

export const quotationFormFromExisting = (quotation: Quotation): QuotationFormValue => ({
  items: quotation.items.map((item) => ({
    description: item.description,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price),
  })),
  discount_amount: String(quotation.discount_amount),
  tax_rate: String(quotation.tax_rate),
  terms: quotation.terms ?? "",
  vendor_notes: quotation.vendor_notes ?? "",
  valid_until: quotation.valid_until.slice(0, 10),
});

export const quotationTotals = (value: QuotationFormValue) => {
  const subtotal = value.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );
  const discount = Number(value.discount_amount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(value.tax_rate) || 0) / 100);

  return {
    subtotal,
    discount,
    tax,
    total: taxable + tax,
  };
};

export const isQuotationFormValid = (value: QuotationFormValue) => {
  const totals = quotationTotals(value);

  return value.items.length > 0
    && value.items.every((item) => item.description.trim().length > 0
      && Number(item.quantity) > 0
      && Number(item.unit_price) >= 0)
    && totals.discount >= 0
    && totals.discount <= totals.subtotal
    && Number(value.tax_rate || 0) >= 0
    && Number(value.tax_rate || 0) <= 100
    && value.valid_until.length > 0;
};

export const quotationPayload = (value: QuotationFormValue): QuotationPayload => ({
  items: value.items.map((item) => ({
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  })),
  discount_amount: Number(value.discount_amount) || 0,
  tax_rate: Number(value.tax_rate) || 0,
  terms: value.terms.trim() || null,
  vendor_notes: value.vendor_notes.trim() || null,
  valid_until: value.valid_until,
});
