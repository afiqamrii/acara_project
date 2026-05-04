import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/Api';

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
};

export const fetchCart = async (): Promise<{ items: CartItem[] }> => {
  const res = await api.get('/bookings/cart');
  return res.data;
};

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableIds, setUnavailableIds] = useState<number[]>([]);

  const { data, isPending } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    staleTime: 1000 * 30,
  });

  const items = data?.items ?? [];
  const total = items.reduce((sum, item) => sum + item.price_value, 0);

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bookings/cart/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setUnavailableIds(prev => prev.filter(uid => uid !== removeMutation.variables));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post('/bookings/confirm'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setConfirmed(true);
      setError(null);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      setError(data?.message ?? 'Failed to confirm booking. Please try again.');
      if (data?.unavailable_ids) {
        setUnavailableIds(data.unavailable_ids);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setError(null);
      setUnavailableIds([]);
    }
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[99] bg-black/45 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <div
        className={`fixed top-0 right-0 z-[100] h-screen w-full max-w-[400px] bg-white flex flex-col shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Your Cart</h2>
            {items.length > 0 && !confirmed && (
              <p className="text-xs text-gray-400 mt-0.5">
                {items.length} service{items.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-8 h-8 text-emerald-500">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-lg mb-2">Booking Submitted!</p>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Your booking request has been sent to the vendors. You can track the status in your Bookings page.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl font-bold text-sm transition-colors"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div key="cart" className="flex-1 flex flex-col overflow-hidden">
              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {isPending ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                  ))
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full pt-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-purple-300">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 01-8 0" />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-400">Your cart is empty</p>
                    <p className="text-xs text-gray-300 mt-1">Browse the marketplace to add services</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {items.map((item) => {
                      const isUnavailable = unavailableIds.includes(item.id);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          className={`rounded-2xl p-4 border transition-colors ${isUnavailable ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}
                        >
                          {isUnavailable && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">
                              Date no longer available — please remove
                            </p>
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                                {item.category}
                              </span>
                              <p className="font-semibold text-gray-900 text-sm mt-1.5 leading-tight">{item.service_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{item.vendor} · {item.location}</p>
                              <div className="mt-2">
                                <span className="text-xs text-gray-500 bg-white rounded-lg px-2 py-1 border border-gray-100 inline-flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {formatDate(item.selected_date)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <p className="text-sm font-bold text-purple-700">{item.price}</p>
                              <p className="text-[10px] text-gray-400">/ {item.pricing_unit}</p>
                              <button
                                onClick={() => removeMutation.mutate(item.id)}
                                disabled={removeMutation.isPending && removeMutation.variables === item.id}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100">
                  {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 leading-relaxed">
                      {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Total estimate</span>
                    <span className="font-bold text-gray-900">RM {total.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-4">Final pricing will be confirmed by vendors</p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setError(null); confirmMutation.mutate(); }}
                    disabled={confirmMutation.isPending || unavailableIds.length > 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-purple-200"
                  >
                    {confirmMutation.isPending ? 'Submitting...' : 'Confirm Booking Request'}
                  </motion.button>
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    Vendors will be notified to confirm your booking
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CartDrawer;
