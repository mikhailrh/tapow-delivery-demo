import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../../components/icons";
import { useStore } from "../../context/StoreContext";

const PRESETS = [15, 25, 45];

export default function PrepTimePickerSheet({
  orderShortId,
  onPick,
  onCancel,
}: {
  orderShortId: string;
  onPick: (minutes: number) => void;
  onCancel: () => void;
}) {
  const { busyDelta } = useStore();
  const [custom, setCustom] = useState<string>("");
  const customRef = useRef<HTMLInputElement | null>(null);

  // Wrap default in busy delta so the kitchen "+15min Busy" surcharge is honored.
  const adjusted = (m: number) => m + busyDelta;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submitCustom = () => {
    const n = parseInt(custom, 10);
    if (Number.isFinite(n) && n > 0 && n < 240) onPick(n);
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
              How long for #{orderShortId}?
            </div>
            <div className="text-[13px] text-brand-muted mt-0.5">
              Customer will see this ETA in WhatsApp.
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

        {busyDelta > 0 && (
          <div className="mb-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Store is on Busy +{busyDelta}min — that's already added to each
            preset.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onPick(adjusted(p))}
              className="rounded-xl bg-brand-canvas hover:bg-gray-100 active:bg-gray-200 transition-colors py-4 text-center"
            >
              <div className="text-[26px] font-bold text-brand-ink leading-none">
                {adjusted(p)}
              </div>
              <div className="text-[11.5px] text-brand-muted mt-1">min</div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 bg-brand-canvas rounded-xl px-3.5 py-2.5">
          <input
            ref={customRef}
            type="number"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom"
            className="flex-1 bg-transparent text-[15px] focus:outline-none"
            min={1}
            max={240}
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

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-full py-3 bg-white border border-gray-200 text-brand-ink font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={() => onPick(adjusted(25))}
            className="rounded-full py-3 bg-brand-green hover:bg-brand-greenDeep active:bg-brand-greenDeep text-white font-bold text-[14px] transition-colors"
          >
            Accept · {adjusted(25)} min
          </button>
        </div>
      </div>
    </div>
  );
}
