import { useEffect, useState } from "react";
import { CloseIcon } from "../../components/icons";
import type { Order } from "../../lib/orders";

const REASONS = [
  "Out of stock",
  "Kitchen swamped",
  "Closing soon",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

export default function RejectModal({
  order,
  onConfirm,
  onCancel,
}: {
  order: Order;
  onConfirm: (reason: string, itemId?: string, refundCredit?: number) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<Reason>("Out of stock");
  const [itemId, setItemId] = useState<string | undefined>(
    order.lines[0]?.itemId,
  );
  const [credit, setCredit] = useState(5);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-7 shadow-2xl max-h-[90dvh] overflow-y-auto"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[20px] font-bold text-brand-ink">
              Reject order #{order.shortId}?
            </div>
            <div className="text-[13px] text-brand-muted mt-0.5">
              Customer is refunded automatically and notified via WhatsApp.
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

        <div className="mt-3">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
            Reason
          </div>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={
                  "rounded-xl px-3 py-3 text-[13.5px] font-semibold border transition-colors text-left " +
                  (reason === r
                    ? "bg-brand-ink text-white border-brand-ink"
                    : "bg-white text-brand-ink border-gray-200")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {reason === "Out of stock" && (
          <div className="mt-4">
            <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
              Which item is out?
            </div>
            <div className="space-y-1.5">
              {order.lines.map((l) => {
                const checked = itemId === l.itemId;
                return (
                  <label
                    key={l.itemId}
                    className={
                      "flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer border transition-colors " +
                      (checked
                        ? "border-brand-green bg-brand-green/5"
                        : "border-gray-200 bg-white")
                    }
                  >
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-brand-ink">
                        {l.quantity}× {l.itemName}
                      </div>
                      {(l.size || l.heat) && (
                        <div className="text-[11.5px] text-brand-muted">
                          {[l.size, l.heat].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <input
                      type="radio"
                      checked={checked}
                      onChange={() => setItemId(l.itemId)}
                      className="sr-only"
                    />
                    <span
                      className={
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center " +
                        (checked ? "border-brand-green" : "border-gray-300")
                      }
                    >
                      {checked && (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11.5px] text-brand-muted mt-2">
              We'll mark it 86'd on the menu so this doesn't happen again
              today.
            </p>
          </div>
        )}

        <div className="mt-4">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
            Apology credit
          </div>
          <div className="flex gap-2">
            {[0, 5, 10].map((c) => (
              <button
                key={c}
                onClick={() => setCredit(c)}
                className={
                  "flex-1 rounded-xl py-2.5 text-[13px] font-semibold border " +
                  (credit === c
                    ? "border-brand-green bg-brand-green/10 text-brand-ink"
                    : "border-gray-200 text-brand-muted")
                }
              >
                {c === 0 ? "None" : `RM${c}`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-full py-3 bg-white border border-gray-200 text-brand-ink font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm(
                reason,
                reason === "Out of stock" ? itemId : undefined,
                credit,
              )
            }
            className="rounded-full py-3 bg-red-600 text-white font-bold text-[14px]"
          >
            Reject + refund
          </button>
        </div>
      </div>
    </div>
  );
}
