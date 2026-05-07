import { useEffect, useState } from "react";
import { CloseIcon } from "../../components/icons";

const PRESETS = [5, 10, 15];

export default function PushBackEtaSheet({
  orderShortId,
  currentPrepMinutes,
  onPick,
  onCancel,
}: {
  orderShortId: string;
  currentPrepMinutes: number;
  onPick: (addMinutes: number) => void;
  onCancel: () => void;
}) {
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submitCustom = () => {
    const n = parseInt(custom, 10);
    if (Number.isFinite(n) && n > 0 && n < 120) onPick(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-7 shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[20px] font-bold text-brand-ink">
              Push back #{orderShortId}
            </div>
            <div className="text-[13px] text-brand-muted mt-0.5">
              Customer gets a "running late" WhatsApp note. Currently{" "}
              {currentPrepMinutes} min.
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-1 -mr-1 -mt-1"
          >
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 transition-colors py-4 text-center border border-amber-200"
            >
              <div className="text-[26px] font-bold text-amber-900 leading-none">
                +{p}
              </div>
              <div className="text-[11.5px] text-amber-700 mt-1">min</div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 bg-brand-canvas rounded-xl px-3.5 py-2.5">
          <span className="text-[15px] text-brand-muted">+</span>
          <input
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom"
            className="flex-1 bg-transparent text-[15px] focus:outline-none"
            min={1}
            max={120}
          />
          <span className="text-[12px] text-brand-muted">min</span>
          <button
            disabled={!custom}
            onClick={submitCustom}
            className={
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold " +
              (custom
                ? "bg-brand-ink text-white"
                : "bg-gray-200 text-gray-400")
            }
          >
            Set
          </button>
        </div>

        <button
          onClick={onCancel}
          className="mt-5 w-full rounded-full py-3 bg-white border border-gray-200 text-brand-ink font-semibold text-[14px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
