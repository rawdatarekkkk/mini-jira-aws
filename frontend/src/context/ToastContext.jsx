/* eslint-disable react-refresh/only-export-components -- React context + provider in one module */
import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const hide = useCallback(() => setToast(null), []);

  const showToast = useCallback((message, variant = "error") => {
    setToast({ message, variant, id: Date.now() });
    const duration = variant === "error" ? 6000 : 4000;
    window.setTimeout(() => setToast((t) => (t?.message === message ? null : t)), duration);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast: hide }), [showToast, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[100] max-w-md rounded-lg border px-4 py-3 shadow-lg ${
            toast.variant === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={hide}
              className="shrink-0 rounded p-1 text-current opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
