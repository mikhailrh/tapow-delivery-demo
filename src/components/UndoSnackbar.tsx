import { useEffect, useState } from "react";

export type UndoToast = {
  id: number;
  message: string;
  /** Called if user taps Undo before the timer expires. */
  onUndo: () => void;
  /** Called when the timer expires (commit). Optional. */
  onCommit?: () => void;
  /** Override default 5000ms. */
  durationMs?: number;
};

let nextId = 1;
export const newToastId = () => nextId++;

export function UndoSnackbar({
  toast,
  onDismiss,
}: {
  toast: UndoToast;
  onDismiss: () => void;
}) {
  const duration = toast.durationMs ?? 5000;
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        toast.onCommit?.();
        onDismiss();
      }
    }, 80);
    return () => clearInterval(interval);
  }, [toast, duration, onDismiss]);

  const pct = (remaining / duration) * 100;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[100] max-w-[90%]"
      style={{ animation: "snackbarIn 0.18s ease-out" }}
    >
      <div className="flex items-center gap-3 bg-brand-ink text-white pl-4 pr-2 py-2 rounded-full shadow-2xl min-w-[260px]">
        <div className="text-[13.5px] font-medium flex-1 leading-snug">
          {toast.message}
        </div>
        <button
          onClick={() => {
            toast.onUndo();
            onDismiss();
          }}
          className="bg-white/15 hover:bg-white/25 text-white rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide"
        >
          Undo
        </button>
      </div>
      <div className="h-[3px] bg-brand-ink/15 rounded-full mt-1 overflow-hidden">
        <div
          className="h-full bg-brand-green transition-all"
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
}
