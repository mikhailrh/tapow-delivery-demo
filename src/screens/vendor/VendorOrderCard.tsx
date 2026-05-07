import { useEffect, useRef, useState } from "react";
import {
  cookingAging,
  digitsOnly,
  elapsedLabel,
  type Order,
} from "../../lib/orders";
import { formatRM } from "../../lib/money";
import { useVenue } from "../../context/VenueContext";
import {
  KebabIcon,
  MessageIcon,
  MotorbikeIcon,
  PackageIcon,
  PhoneIcon,
} from "../../components/icons";

export type CardMenuItem = {
  label: string;
  tone?: "default" | "destructive";
  onClick: () => void;
};

export default function VendorOrderCard({
  order,
  isFresh,
  primaryAction,
  primaryLabel,
  secondaryAction,
  menuItems,
  rightAccessory,
  showDriver = false,
}: {
  order: Order;
  /** First 500ms after a card lands in INCOMING. */
  isFresh?: boolean;
  primaryAction?: () => void;
  primaryLabel?: string;
  /** Single-action kebab (legacy: incoming → reject). */
  secondaryAction?: () => void;
  /** Multi-action kebab popover. Takes precedence over secondaryAction. */
  menuItems?: CardMenuItem[];
  rightAccessory?: React.ReactNode;
  showDriver?: boolean;
}) {
  const venue = useVenue();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ageRef = useRef<HTMLDivElement | null>(null);

  const aging = cookingAging(order, now);
  const isCooking = order.status === "cooking";
  const isCancelled = order.status === "cancelled";

  let bgClass = "bg-white";
  let pulseStyle: React.CSSProperties = {};
  if (isCancelled) {
    bgClass = "bg-red-50";
  } else if (isCooking) {
    if (aging >= 1.2) {
      bgClass = "bg-red-50";
      pulseStyle = { animation: "prepBreachPulse 2.4s ease-in-out infinite" };
    } else if (aging >= 1.0) {
      bgClass = "bg-amber-100";
    } else if (aging >= 0.8) {
      bgClass = "bg-amber-50";
    }
  }

  const flashStyle: React.CSSProperties = isCancelled
    ? { animation: "cardFlash 0.9s ease-out" }
    : isFresh
      ? { animation: "cardFlash 0.9s ease-out" }
      : {};

  const phoneDigits = digitsOnly(order.customerPhone);
  const waText = encodeURIComponent(
    `Hey ${order.customerName.split(" ")[0]}, it's ${venue.name} — `,
  );
  const waLink = `https://wa.me/${phoneDigits}?text=${waText}`;
  const telLink = `tel:+${phoneDigits}`;

  return (
    <div
      ref={ageRef}
      className={
        "relative rounded-2xl border border-gray-200 shadow-sm p-4 transition-colors " +
        bgClass
      }
      style={{ ...flashStyle, ...pulseStyle }}
    >
      {/* Top row: order # + customer + elapsed */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold text-brand-ink leading-none">
              #{order.shortId}
            </span>
            <FulfillmentPill type={order.fulfillment} />
          </div>
          <div className="text-[14px] font-semibold text-brand-ink mt-1.5 truncate">
            {order.customerName}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <div className="text-[11px] text-brand-muted">since</div>
            <div className="text-[14px] font-bold text-brand-ink leading-none mt-0.5 tabular-nums">
              {elapsedLabel(now, order.placedAt)}
            </div>
          </div>
          {rightAccessory}
          {menuItems && menuItems.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Order actions"
                className="-mt-1 -mr-1 w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center flex-shrink-0"
              >
                <KebabIcon className="w-5 h-5 text-brand-muted" />
              </button>
              {menuOpen && (
                <>
                  <button
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div className="absolute right-0 top-9 z-30 min-w-[180px] bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 overflow-hidden">
                    {menuItems.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setMenuOpen(false);
                          m.onClick();
                        }}
                        className={
                          "block w-full text-left px-4 py-2.5 text-[13.5px] font-semibold hover:bg-brand-canvas/60 " +
                          (m.tone === "destructive"
                            ? "text-red-600"
                            : "text-brand-ink")
                        }
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : secondaryAction ? (
            <button
              onClick={secondaryAction}
              aria-label="Reject order"
              className="-mt-1 -mr-1 w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center flex-shrink-0"
            >
              <KebabIcon className="w-5 h-5 text-brand-muted" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1.5">
        {order.lines.map((l, i) => (
          <li key={i} className="text-[13px] leading-snug">
            <div className="font-semibold text-brand-ink">
              {l.quantity}× {l.itemName}
            </div>
            <div className="text-brand-muted text-[12px]">
              {[l.size, l.heat, l.dip, l.side, ...l.addons]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </li>
        ))}
      </ul>

      {order.note && (
        <div className="mt-3 text-[12.5px] italic bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 text-yellow-900">
          “{order.note}”
        </div>
      )}

      {/* Driver block */}
      {showDriver && order.driver && (
        <div className="mt-3 flex items-center gap-2.5 bg-brand-canvas rounded-xl px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-ink text-white text-[11px] font-bold flex items-center justify-center">
            {order.driver.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-brand-ink truncate">
              {order.driver.name}
            </div>
            <div className="text-[11px] text-brand-muted truncate">
              <MotorbikeIcon className="w-3 h-3 inline -mt-0.5 mr-1" />
              {order.status === "ready"
                ? "Arriving in ~6 min"
                : `Arriving in ~${order.driver.etaMinutes} min`}
            </div>
          </div>
          <a
            href={telLink}
            aria-label="Call driver"
            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center"
          >
            <PhoneIcon className="w-3.5 h-3.5 text-brand-ink" />
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp driver"
            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center"
          >
            <MessageIcon className="w-3.5 h-3.5 text-brand-ink" />
          </a>
        </div>
      )}

      {/* Address (delivery only) */}
      {order.fulfillment === "delivery" && order.address && !showDriver && (
        <div className="mt-2 text-[11.5px] text-brand-muted">
          → {order.address}
        </div>
      )}

      {/* Footer: total + primary action */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[15px] font-bold text-brand-ink tabular-nums">
          {formatRM(order.total)}
        </div>
        <div className="flex items-center gap-2">
          {isCooking && order.prepMinutes && (
            <PrepCountdown order={order} now={now} />
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp customer"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center"
          >
            <MessageIcon className="w-4 h-4 text-brand-ink" />
          </a>
        </div>
      </div>

      {primaryAction && primaryLabel && !isCancelled && (
        <button
          onClick={primaryAction}
          className="mt-3 w-full bg-brand-green hover:bg-brand-green/90 active:bg-brand-green/80 text-white font-bold py-3.5 rounded-xl text-[15px] shadow-sm transition-colors"
        >
          {primaryLabel}
        </button>
      )}

      {isCancelled && (
        <div className="absolute inset-0 rounded-2xl bg-red-600/85 flex items-center justify-center">
          <div className="text-white font-extrabold text-[15px] tracking-wide uppercase">
            Cancelled by customer
          </div>
        </div>
      )}
    </div>
  );
}

function FulfillmentPill({ type }: { type: "delivery" | "pickup" }) {
  if (type === "delivery") {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
        <MotorbikeIcon className="w-3 h-3" />
        Delivery
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">
      <PackageIcon className="w-3 h-3" />
      Pickup
    </span>
  );
}

function PrepCountdown({ order, now }: { order: Order; now: number }) {
  if (!order.acceptedAt || !order.prepMinutes) return null;
  const targetMs = order.acceptedAt + order.prepMinutes * 60_000;
  const remaining = targetMs - now;
  const overdue = remaining < 0;
  const totalSec = Math.floor(Math.abs(remaining) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const label = `${m}:${String(s).padStart(2, "0")}`;
  return (
    <div
      className={
        "text-[12px] font-bold tabular-nums px-2 py-1 rounded-md " +
        (overdue ? "text-red-700 bg-red-100" : "text-brand-ink bg-brand-canvas")
      }
    >
      {overdue ? `+${label}` : label}
    </div>
  );
}
