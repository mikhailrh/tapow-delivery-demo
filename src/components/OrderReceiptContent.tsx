import { formatRM } from "../lib/money";
import type { Order } from "../lib/orders";

/**
 * Canonical line-items + totals block shared by:
 *   - [WhatsAppScreen.tsx](src/screens/WhatsAppScreen.tsx) receipt bubble
 *   - [OrderTrackingScreen.tsx](src/screens/OrderTrackingScreen.tsx) "View order summary" expandable
 *
 * Surface-agnostic — both wrap their own chrome (greeting, address, order
 * ref, etc.) around it. Pure read of the Order; no actions.
 */
export default function OrderReceiptContent({ order }: { order: Order }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-[12.5px] space-y-2">
      {order.lines.map((s, idx) => (
        <div key={idx}>
          <div className="flex justify-between gap-3">
            <span className="font-medium">
              {s.quantity}× {s.itemName}
            </span>
            <span className="font-medium whitespace-nowrap">
              {formatRM(s.unitPrice * s.quantity)}
            </span>
          </div>
          {s.modifierLabels.length > 0 && (
            <div className="text-brand-muted text-[11.5px] leading-snug mt-0.5 pl-2">
              {s.modifierLabels.join(" · ")}
            </div>
          )}
        </div>
      ))}
      <div className="border-t border-gray-200 mt-1.5 pt-1.5">
        <Row label="Subtotal" value={formatRM(order.subtotal)} />
        <Row
          label="Platform fee (1%)"
          value={formatRM(order.platformFee)}
        />
        <Row label="SST (6%)" value={formatRM(order.sst)} />
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
        <Row
          label={<span className="font-bold">Total</span>}
          value={<span className="font-bold">{formatRM(order.total)}</span>}
        />
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
    <div className="flex justify-between gap-3 py-0.5 text-[12px]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
