import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import type { AxiosError } from 'axios';
import api from '../../../lib/Api';
import BookingBriefForm from '../../bookings/components/BookingBriefForm';
import {
  bookingBriefPayload,
  emptyBookingBrief,
  isBookingBriefValid,
  type BookingBriefFormValue,
} from '../../bookings/components/bookingBriefFormState';
import { fetchCart, type CartItem } from './cartApi';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const briefFormValue = (item: CartItem): BookingBriefFormValue => ({
  ...emptyBookingBrief(),
  event_title: item.brief?.event_title ?? '',
  event_type: item.brief?.event_type ?? '',
  venue_name: item.brief?.venue_name ?? '',
  venue_address: item.brief?.venue_address ?? '',
  start_time: item.brief?.start_time ?? '',
  end_time: item.brief?.end_time ?? '',
  guest_count: item.brief?.guest_count ? String(item.brief.guest_count) : '',
  contact_name: item.brief?.contact_name ?? '',
  contact_phone: item.brief?.contact_phone ?? '',
  setup_time: item.brief?.setup_time ?? '',
  requirements: item.brief?.requirements ?? '',
  notes: item.notes ?? '',
});

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as AxiosError<{ message?: string }>).response?.data?.message ?? fallback;

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailableIds, setUnavailableIds] = useState<number[]>([]);
  const [incompleteIds, setIncompleteIds] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [briefDraft, setBriefDraft] = useState<BookingBriefFormValue>(() => emptyBookingBrief());
  const [briefError, setBriefError] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    staleTime: 1000 * 30,
    enabled: open,
  });

  const items = data?.items ?? [];
  const total = items.reduce((sum, item) => sum + item.price_value, 0);

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bookings/cart/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setUnavailableIds(prev => prev.filter(uid => uid !== removeMutation.variables));
      setIncompleteIds(prev => prev.filter(uid => uid !== removeMutation.variables));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post('/bookings/confirm'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setConfirmed(true);
      setError(null);
    },
    onError: (err: unknown) => {
      const data = (err as AxiosError<{ message?: string; unavailable_ids?: number[]; incomplete_ids?: number[] }>).response?.data;
      setError(data?.message ?? 'Failed to confirm booking. Please try again.');
      if (data?.unavailable_ids) {
        setUnavailableIds(data.unavailable_ids);
      }
      if (data?.incomplete_ids) {
        setIncompleteIds(data.incomplete_ids);
      }
    },
  });

  const briefMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: BookingBriefFormValue }) =>
      api.put(`/bookings/cart/${id}/brief`, bookingBriefPayload(value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (editingItem) {
        setIncompleteIds(prev => prev.filter(id => id !== editingItem.id));
      }
      setEditingItem(null);
      setBriefError(null);
    },
    onError: (err: unknown) => {
      setBriefError(apiErrorMessage(err, 'The event brief could not be updated.'));
    },
  });

  useEffect(() => {
    if (!open) {
      // This controlled drawer must discard transient success/error state when its parent closes it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfirmed(false);
      setError(null);
      setUnavailableIds([]);
      setIncompleteIds([]);
      setEditingItem(null);
      setBriefError(null);
    }
  }, [open]);

  const openBriefEditor = (item: CartItem) => {
    briefMutation.reset();
    setBriefDraft(briefFormValue(item));
    setBriefError(null);
    setEditingItem(item);
  };

  const hasIncompleteBrief = items.some(item => !item.brief);

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
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center h-full pt-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-red-400">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="font-semibold text-gray-500">Failed to load cart</p>
                    <p className="text-xs text-gray-400 mt-1">Please refresh the page and try again</p>
                  </div>
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
                      const isIncomplete = incompleteIds.includes(item.id) || !item.brief;
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 40 }}
                          className={`rounded-2xl p-4 border transition-colors ${isUnavailable
                            ? 'bg-red-50 border-red-200'
                            : isIncomplete
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-gray-50 border-transparent'}`}
                        >
                          {isUnavailable && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">
                              Date no longer available — please remove
                            </p>
                          )}
                          {isIncomplete && !isUnavailable && (
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                              Event brief required before submission
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
                              {item.brief && (
                                <div className="mt-2 rounded-xl border border-purple-100 bg-white px-2.5 py-2">
                                  <p className="truncate text-xs font-bold text-slate-800">{item.brief.event_title}</p>
                                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                                    {item.brief.event_type} · {item.brief.venue_name} · {item.brief.start_time}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <p className="text-sm font-bold text-purple-700">{item.price}</p>
                              <p className="text-[10px] text-gray-400">/ {item.pricing_unit}</p>
                              <button
                                onClick={() => openBriefEditor(item)}
                                className="text-xs font-semibold text-purple-600 transition-colors hover:text-purple-800"
                              >
                                {item.brief ? 'Edit brief' : 'Add brief'}
                              </button>
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
                    disabled={confirmMutation.isPending || unavailableIds.length > 0 || hasIncompleteBrief}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-purple-200"
                  >
                    {confirmMutation.isPending ? 'Submitting...' : 'Confirm Booking Request'}
                  </motion.button>
                  <p className="text-[10px] text-gray-400 text-center mt-2">
                    {hasIncompleteBrief ? 'Complete every event brief before submitting' : 'Vendors will receive your structured event details'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onClick={() => !briefMutation.isPending && setEditingItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Booking request</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    {editingItem.brief ? 'Edit event brief' : 'Complete event brief'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{editingItem.service_name} · {editingItem.vendor}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={briefMutation.isPending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close event brief editor"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <BookingBriefForm
                  value={briefDraft}
                  onChange={setBriefDraft}
                  selectedDate={editingItem.selected_date}
                />
                {briefError && (
                  <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{briefError}</p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={briefMutation.isPending}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => briefMutation.mutate({ id: editingItem.id, value: briefDraft })}
                  disabled={briefMutation.isPending || !isBookingBriefValid(briefDraft)}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-100 hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {briefMutation.isPending ? 'Saving...' : 'Save event brief'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
