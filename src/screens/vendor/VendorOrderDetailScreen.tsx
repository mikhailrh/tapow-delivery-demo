import { useState } from "react";
import { useOrders } from "../../context/OrdersContext";
import { useVendorNav } from "../../context/VendorNavContext";
import {
  BackIcon,
  CloseIcon,
  MessageIcon,
  PhoneIcon,
} from "../../components/icons";
import { formatRM } from "../../lib/money";
import { digitsOnly, type Order, type RefundReason } from "../../lib/orders";

export default function VendorOrderDetailScreen({
  orderId,
}: {
  orderId: string;
}) {
  const { getById, sendVendorMessage, issueRefund } = useOrders();
  const { back } = useVendorNav();
  const [messageOpen, setMessageOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const order = getById(orderId);

  if (!order) {
    return (
      <div className="p-6">
        Order not found.{" "}
        <button onClick={back} className="text-brand-green underline">
          Go back
        </button>
      </div>
    );
  }

  const phone = digitsOnly(order.customerPhone);

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-4 lg:px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={back} aria-label="Back" className="p-1 -ml-1">
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <div className="flex-1">
          <div className="text-[16px] font-bold text-brand-ink leading-tight">
            Order #{order.shortId}
          </div>
          <div className="text-[11.5px] text-brand-muted capitalize">
            {order.fulfillment} · {order.status}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide">
            Customer
          </div>
          <div className="mt-1 text-[16px] font-bold text-brand-ink">
            {order.customerName}
          </div>
          <div className="text-[13px] text-brand-muted mt-0.5">
            {order.customerPhone}
          </div>
          {order.address && (
            <div className="text-[13px] text-brand-muted mt-0.5">
              → {order.address}
            </div>
          )}
          <div className="mt-3 flex gap-2 flex-wrap">
            <a
              href={`tel:+${phone}`}
              className="inline-flex items-center gap-1.5 bg-brand-canvas rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink"
            >
              <PhoneIcon className="w-4 h-4" /> Call
            </a>
            <button
              onClick={() => setMessageOpen(true)}
              className="inline-flex items-center gap-1.5 bg-brand-ink text-white rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
            >
              <MessageIcon className="w-4 h-4" /> Send message
            </button>
          </div>
        </div>

        <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
            Items
          </div>
          {order.lines.map((l, i) => (
            <div
              key={i}
              className="flex justify-between gap-3 py-2 text-[13.5px] border-b border-gray-50 last:border-b-0"
            >
              <div className="flex-1">
                <div className="font-semibold text-brand-ink">
                  {l.quantity}× {l.itemName}
                </div>
                {(l.size || l.heat || l.dip || l.side || l.addons.length > 0) && (
                  <div className="text-brand-muted text-[12px]">
                    {[l.size, l.heat, l.dip, l.side, ...l.addons]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </div>
              <div className="font-semibold text-brand-ink tabular-nums">
                {formatRM(l.unitPrice * l.quantity)}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
            Totals
          </div>
          <Row label="Subtotal" value={formatRM(order.subtotal)} />
          <Row label="Service charge" value={formatRM(order.serviceCharge)} />
          <Row label="SST" value={formatRM(order.sst)} />
          {order.deliveryFee > 0 && (
            <Row label="Delivery" value={formatRM(order.deliveryFee)} />
          )}
          {order.discount && order.discount > 0 ? (
            <Row
              label={
                <span className="text-brand-green">
                  Discount · {order.promoCode ?? "Promo"}
                </span>
              }
              value={
                <span className="text-brand-green">
                  -{formatRM(order.discount)}
                </span>
              }
            />
          ) : null}
          <div className="h-px bg-gray-100 my-2" />
          <Row
            label={<span className="font-bold text-brand-ink">Total</span>}
            value={
              <span className="font-bold text-brand-ink">
                {formatRM(order.total)}
              </span>
            }
          />
        </div>

        {order.note && (
          <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
            <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
              Customer note
            </div>
            <div className="text-[13.5px] italic text-brand-ink bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              "{order.note}"
            </div>
          </div>
        )}

        <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
          <div className="text-[12px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
            Timeline
          </div>
          <ul className="space-y-2.5">
            {order.statusUpdates.map((u, i) => (
              <li key={i} className="flex gap-3 text-[13px]">
                <div className="text-brand-muted tabular-nums w-14 flex-shrink-0">
                  {new Date(u.at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex-1 leading-snug">
                  {u.fromVendor && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-brand-ink text-white px-1.5 py-0.5 rounded mr-1.5 align-middle">
                      Kitchen
                    </span>
                  )}
                  <span
                    className={
                      u.fromVendor ? "text-brand-ink" : "text-brand-ink"
                    }
                  >
                    {u.text}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {order.status === "rejected" && (
          <div className="px-5 lg:px-6 py-4">
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-[13px] text-red-900">
              Rejected · {order.rejectionReason ?? "No reason"} ·{" "}
              {order.refundCredit
                ? `RM${order.refundCredit} apology credit issued`
                : "no apology credit"}
            </div>
          </div>
        )}

        {order.refund && (
          <div className="px-5 lg:px-6 py-4 border-b border-gray-100">
            <div
              className={
                "rounded-xl px-3 py-2.5 text-[13px] " +
                (order.refund.status === "processed"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border border-amber-200 text-amber-900")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {order.refund.status === "processed"
                    ? "Refunded"
                    : "Refund pending"}
                </span>
                <span className="font-bold tabular-nums">
                  {formatRM(order.refund.amount)}
                </span>
              </div>
              <div className="text-[11.5px] mt-0.5 opacity-80">
                {order.refund.reason}
                {order.refund.note ? ` · ${order.refund.note}` : ""}
              </div>
            </div>
          </div>
        )}

        <div className="px-5 lg:px-6 py-5">
          {refundEligible(order) ? (
            <button
              onClick={() => setRefundOpen(true)}
              disabled={order.refund?.status === "pending"}
              className={
                "w-full font-semibold rounded-full py-3 text-[13.5px] " +
                (order.refund?.status === "pending"
                  ? "bg-amber-100 text-amber-700 cursor-not-allowed"
                  : "bg-brand-ink text-white")
              }
            >
              {order.refund?.status === "processed"
                ? "Issue another refund"
                : order.refund?.status === "pending"
                  ? "Refund processing…"
                  : "Issue refund"}
            </button>
          ) : (
            <div className="text-center text-[12px] text-brand-muted">
              {refundUnavailableReason(order)}
            </div>
          )}
        </div>
      </div>

      {refundOpen && (
        <RefundSheet
          shortId={order.shortId}
          maxAmount={order.total}
          onClose={() => setRefundOpen(false)}
          onSubmit={(amount, reason, note) => {
            issueRefund(order.id, amount, reason, note);
            setRefundOpen(false);
          }}
        />
      )}

      {messageOpen && (
        <SendMessageSheet
          shortId={order.shortId}
          onClose={() => setMessageOpen(false)}
          onSend={(text) => {
            sendVendorMessage(order.id, text);
            setMessageOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function refundEligible(order: Order): boolean {
  if (
    order.status !== "cooking" &&
    order.status !== "ready" &&
    order.status !== "collected"
  ) {
    return false;
  }
  return true;
}

export function refundUnavailableReason(order: Order): string {
  if (order.status === "incoming")
    return "Refunds open after the order is accepted.";
  if (order.status === "rejected")
    return order.refundCredit
      ? "Customer already received an apology credit on rejection."
      : "Order was rejected — auto-refunded by Billplz.";
  if (order.status === "cancelled")
    return "Cancelled by customer — auto-refunded by Billplz.";
  return "Refund unavailable.";
}

const REFUND_REASONS: RefundReason[] = [
  "Out of stock",
  "Late",
  "Wrong order",
  "Other",
];

function RefundSheet({
  shortId,
  maxAmount,
  onClose,
  onSubmit,
}: {
  shortId: string;
  maxAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, reason: RefundReason, note?: string) => void;
}) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [reason, setReason] = useState<RefundReason>("Out of stock");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0)
      return setError("Enter a positive amount.");
    if (num > maxAmount + 0.001)
      return setError(`Max refund is ${formatRM(maxAmount)}.`);
    onSubmit(
      Math.round(num * 100) / 100,
      reason,
      note.trim() || undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full sm:max-w-md shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">
              Issue refund
            </div>
            <div className="text-[11.5px] text-brand-muted">
              #{shortId} · max {formatRM(maxAmount)}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Amount
            </div>
            <div className="flex items-center gap-2 bg-brand-canvas rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-green">
              <span className="text-brand-muted text-[14px] font-semibold">
                RM
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="flex-1 bg-transparent text-[15px] tabular-nums focus:outline-none"
              />
              <button
                onClick={() => setAmount(maxAmount.toFixed(2))}
                className="text-brand-green text-[12px] font-bold uppercase tracking-wide"
              >
                Full
              </button>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
              Reason
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REFUND_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={
                    "py-2 rounded-lg text-[13px] font-semibold transition-colors border " +
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
          {reason === "Other" && (
            <div>
              <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-1.5">
                Detail
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional — what happened?"
                rows={2}
                className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>
          )}
          {error && <div className="text-red-600 text-[13px]">{error}</div>}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 bg-red-600 text-white rounded-full py-3 font-semibold text-[14px]"
          >
            Refund {formatRM(Number(amount) || 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

const QUICK_REPLIES = [
  "Hey, we're out of XX Hot — would Xtra Hot work as a sub?",
  "Heads up, we're running ~5 min behind on yours.",
  "Driver's at your door — let us know if anything changes.",
  "Can you confirm the apartment unit number?",
];

function SendMessageSheet({
  shortId,
  onClose,
  onSend,
}: {
  shortId: string;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full sm:max-w-md shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-brand-ink">
              Message customer
            </div>
            <div className="text-[11.5px] text-brand-muted">
              #{shortId} · sent over WhatsApp
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <CloseIcon className="w-6 h-6 text-brand-ink" />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-2">
            Quick replies
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_REPLIES.map((q, i) => (
              <button
                key={i}
                onClick={() => setText(q)}
                className="text-left bg-brand-canvas hover:bg-gray-100 transition-colors rounded-xl px-3 py-2 text-[12.5px] text-brand-ink leading-snug"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold text-brand-muted uppercase tracking-wide mb-2">
            Or type your own
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            rows={3}
            className="w-full bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
          />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Cancel
          </button>
          <button
            disabled={!trimmed}
            onClick={() => onSend(trimmed)}
            className={
              "flex-1 rounded-full py-3 font-semibold text-[14px] " +
              (trimmed
                ? "bg-brand-ink text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed")
            }
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-[13.5px] text-brand-ink">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
