import api from "../../lib/Api";

export type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type ReviewableBooking = {
  booking_id: number;
  booking_reference: string;
  service_id: number;
  service_name: string;
  vendor_name: string;
  selected_date: string;
  completed_at: string;
  review: Review | null;
};

export type ReviewsResponse = {
  bookings: ReviewableBooking[];
  summary: {
    total: number;
    reviewed: number;
    awaiting_review: number;
  };
};

export type SaveReviewInput = {
  bookingId: number;
  reviewId?: number;
  rating: number;
  comment: string;
};

export const fetchReviewableBookings = async (): Promise<ReviewsResponse> => {
  const response = await api.get<ReviewsResponse>("/reviews");
  return response.data;
};

export const saveReview = async ({
  bookingId,
  reviewId,
  rating,
  comment,
}: SaveReviewInput): Promise<Review> => {
  const payload = { rating, comment };
  const response = reviewId
    ? await api.patch<{ review: Review }>(`/reviews/${reviewId}`, payload)
    : await api.post<{ review: Review }>(`/bookings/${bookingId}/review`, payload);

  return response.data.review;
};
