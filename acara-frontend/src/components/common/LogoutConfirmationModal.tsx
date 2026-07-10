import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconLogout, IconX } from "@tabler/icons-react";

type LogoutConfirmationModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function LogoutConfirmationModal({
  isOpen,
  onCancel,
  onConfirm,
}: LogoutConfirmationModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    isLoggingOutRef.current = isLoggingOut;
  }, [isLoggingOut]);

  useEffect(() => {
    if (!isOpen) {
      setIsLoggingOut(false);
      return;
    }

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoggingOutRef.current) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await onConfirm();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoggingOut) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-7 shadow-2xl shadow-slate-950/20 sm:p-8"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoggingOut}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close logout confirmation"
        >
          <IconX size={19} />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <IconLogout size={27} stroke={1.8} />
        </div>

        <h2 id="logout-dialog-title" className="pr-10 text-2xl font-bold tracking-tight text-slate-900">
          Log out of ACARA?
        </h2>
        <p id="logout-dialog-description" className="mt-2 text-sm leading-6 text-slate-500">
          You will need to sign in again to access your dashboard and continue managing your account.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoggingOut}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Stay logged in
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoggingOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Logging out...
              </>
            ) : (
              "Yes, log out"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
