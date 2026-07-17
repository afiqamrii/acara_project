import api from '../../../lib/Api';
import type { BookingBrief } from '../../bookings/api';

export type CartItem = {
  id: number;
  service_id: number;
  service_name: string;
  category: string;
  vendor: string;
  location: string;
  price: string;
  price_value: number;
  pricing_unit: string;
  selected_date: string;
  notes: string | null;
  brief: BookingBrief | null;
};

export const fetchCart = async (): Promise<{ items: CartItem[] }> => {
  const res = await api.get('/bookings/cart');
  return res.data;
};
