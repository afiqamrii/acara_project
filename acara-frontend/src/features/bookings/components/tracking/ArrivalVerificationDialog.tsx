import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { IconMapPin, IconCamera, IconAlertCircle, IconRefresh } from "@tabler/icons-react";

type Coords = { latitude: number; longitude: number; accuracy: number };

const ArrivalVerificationDialog = ({
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  onClose: () => void;
  onSubmit: (payload: { latitude: number; longitude: number; accuracy: number; photo: File }) => void;
  submitting: boolean;
  error?: string;
}) => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocating(false);
      setLocationError("Your browser does not support location access.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Enable location access for this site and retry."
            : "Could not determine your location. Retry from an area with a better signal.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    // Kicks off the browser's location permission prompt as soon as the dialog mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const canSubmit = Boolean(coords) && Boolean(photo) && !submitting;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <IconMapPin size={22} />
        </div>
        <h3 className="mb-1 text-base font-bold text-gray-900">Verify arrival</h3>
        <p className="mb-6 text-sm leading-5 text-gray-500">
          Marking "Arrived / Service Started" requires your current location and a photo taken now, so the
          organizer and admin can trust this update.
        </p>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
          <p className="mb-1 text-xs font-bold text-gray-700">Current location</p>
          {locating && <p className="text-xs text-slate-500">Getting your location…</p>}
          {!locating && coords && (
            <p className="text-xs font-semibold text-emerald-700">
              Captured ({coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}) · accuracy ~
              {Math.round(coords.accuracy)}m
            </p>
          )}
          {!locating && locationError && (
            <div className="flex items-start gap-2">
              <IconAlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-xs text-red-600">{locationError}</p>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800"
                >
                  <IconRefresh size={13} /> Retry location
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <IconCamera size={14} /> Arrival photo
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-indigo-700"
          />
          {photoPreview && <img src={photoPreview} alt="Arrival preview" className="mt-2 h-32 w-full rounded-xl object-cover" />}
        </label>

        {error && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => coords && photo && onSubmit({ ...coords, photo })}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-indigo-700 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm Arrival"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ArrivalVerificationDialog;
