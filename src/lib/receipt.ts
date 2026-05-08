import type { Order } from "./orders";
import type { VenueProfile } from "../context/VenueProfileContext";
import { formatRM } from "./money";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function rowHtml(label: string, value: string, opts?: { bold?: boolean; emerald?: boolean }) {
  const cls = opts?.bold ? "font-bold" : "";
  const colorStyle = opts?.emerald ? "color:#059669;" : "";
  return `
    <div class="row ${cls}" style="${colorStyle}">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>`;
}

export function openPrintableReceipt(order: Order, profile: VenueProfile) {
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return;
  w.document.open();
  w.document.write(buildReceiptHtml(order, profile));
  w.document.close();
  w.focus();
  // Defer print to allow render
  w.setTimeout(() => w.print(), 100);
}

function buildReceiptHtml(order: Order, profile: VenueProfile): string {
  const issuedAt = new Date(order.collectedAt ?? order.placedAt);
  const lines = order.lines
    .map((l) => {
      const detail =
        l.modifierLabels.length > 0
          ? `<div class="line-detail">${escapeHtml(l.modifierLabels.join(" · "))}</div>`
          : "";
      return `
        <div class="line">
          <div class="line-main">
            <span class="line-name">${l.quantity}× ${escapeHtml(l.itemName)}</span>
            <span class="line-amount">${formatRM(l.unitPrice * l.quantity)}</span>
          </div>
          ${detail}
        </div>`;
    })
    .join("");

  const sstSection = profile.sstRegistrationNumber.trim()
    ? rowHtml(`SST (6%)`, formatRM(order.sst))
    : "";
  const sstNote = profile.sstRegistrationNumber.trim()
    ? `<div class="muted">SST Reg: ${escapeHtml(profile.sstRegistrationNumber)}</div>`
    : `<div class="muted">SST: not applicable (vendor not SST-registered)</div>`;

  const discountRow =
    order.discount && order.discount > 0
      ? rowHtml(
          `Discount${order.promoCode ? ` · ${order.promoCode}` : ""}`,
          `-${formatRM(order.discount)}`,
          { emerald: true },
        )
      : "";

  const refundRow = order.refund
    ? `<div class="refund-row">
        ${order.refund.status === "processed" ? "Refunded" : "Refund pending"}: ${formatRM(order.refund.amount)}
        <span class="muted">(${escapeHtml(order.refund.reason)})</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt · #${escapeHtml(order.shortId)} · ${escapeHtml(profile.businessName)}</title>
  <style>
    @page { margin: 16mm; size: 80mm auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      color: #0a0a0a;
      max-width: 420px;
      margin: 0 auto;
      padding: 24px 20px;
      font-size: 13px;
      line-height: 1.4;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 4px 0;
    }
    .muted { color: #6b6b6b; font-size: 11px; }
    .header { text-align: center; padding-bottom: 12px; border-bottom: 1px dashed #d1d5db; }
    .powered { font-size: 10px; color: #6b6b6b; margin-top: 4px; }
    .section { padding: 12px 0; border-bottom: 1px dashed #d1d5db; }
    .section:last-of-type { border-bottom: 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
    .row.font-bold { font-weight: 700; }
    .line { padding: 4px 0; }
    .line-main { display: flex; justify-content: space-between; gap: 12px; }
    .line-name { font-weight: 500; }
    .line-detail { color: #6b6b6b; font-size: 11px; padding-left: 12px; margin-top: 1px; }
    .totals { margin-top: 6px; }
    .footer { text-align: center; margin-top: 18px; font-size: 11px; color: #6b6b6b; }
    .refund-row {
      margin-top: 8px;
      padding: 6px 8px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 4px;
      font-size: 12px;
    }
    button.print-btn {
      display: block;
      margin: 16px auto 0;
      padding: 8px 18px;
      background: #0a0a0a;
      color: #fff;
      border: 0;
      border-radius: 999px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print { button.print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(profile.businessName)}</h1>
    <div class="muted">${escapeHtml(profile.address)}</div>
    <div class="muted">SSM: ${escapeHtml(profile.ssmNumber)}</div>
    ${sstNote}
    <div class="powered">via Tapow · tapow.my</div>
  </div>

  <div class="section">
    <div class="row">
      <span><strong>Tax invoice</strong> · #${escapeHtml(order.shortId)}</span>
      <span class="muted">${escapeHtml(issuedAt.toLocaleString("en-GB"))}</span>
    </div>
    <div class="muted">${escapeHtml(order.fulfillment === "delivery" ? "Delivery" : "Pickup")} · ${escapeHtml(order.customerName)}</div>
    ${order.address ? `<div class="muted">${escapeHtml(order.address)}</div>` : ""}
  </div>

  <div class="section">
    ${lines}
  </div>

  <div class="section totals">
    ${rowHtml("Subtotal", formatRM(order.subtotal))}
    ${rowHtml("Service charge (10%)", formatRM(order.serviceCharge))}
    ${sstSection}
    ${order.deliveryFee > 0 ? rowHtml("Delivery", formatRM(order.deliveryFee)) : ""}
    ${discountRow}
    ${rowHtml("Total", formatRM(order.total), { bold: true })}
    ${refundRow}
  </div>

  <div class="footer">
    Paid · Card •••• 4242<br/>
    Thanks for ordering with ${escapeHtml(profile.businessName)}.<br/>
    ${escapeHtml(profile.businessName)} and <strong>Tapow</strong> · tapow.my
  </div>

  <button class="print-btn" onclick="window.print()">Print</button>
</body>
</html>`;
}
