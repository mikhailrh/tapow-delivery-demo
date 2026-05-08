import { useMemo, useState } from "react";
import { useCart, type CartLine } from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { usePromos } from "../context/PromoContext";
import { useVenue } from "../context/VenueContext";
import { formatRM } from "../lib/money";
import {
  CloseIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  NoteIcon,
  ChevronRightIcon,
  CheckIcon,
} from "../components/icons";

export default function CartScreen() {
  const { back, go } = useNav();
  const {
    lines,
    subtotal,
    updateQty,
    removeLine,
    note,
    setNote,
    promoCode,
    setPromoCode,
  } = useCart();
  const { applyCode, bestAutoFor, computeDiscount, promos } = usePromos();
  const venue = useVenue();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note);

  const addressParts = venue.address.split(",").map((s) => s.trim());
  const venueLocality = addressParts[1] ?? addressParts[0] ?? "";
  const venueHeadline = addressParts[0]
    ? `${venue.name}, ${addressParts[0]}`
    : venue.name;

  const codeMatch = useMemo(
    () =>
      promoCode
        ? promos.find(
            (p) => (p.code ?? "").toUpperCase() === promoCode.toUpperCase(),
          ) ?? null
        : null,
    [promoCode, promos],
  );

  const autoPromo = useMemo(
    () => (codeMatch ? null : bestAutoFor(subtotal)),
    [codeMatch, bestAutoFor, subtotal],
  );

  const activePromo = codeMatch ?? autoPromo;
  const discount = activePromo ? computeDiscount(activePromo, subtotal) : 0;

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={back}
          aria-label="Close"
          className="p-1 -ml-1"
        >
          <CloseIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <h1 className="text-[17px] font-semibold text-brand-ink">Your cart</h1>
        <div className="w-6" />
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[22px] font-bold text-brand-ink">
            {venueHeadline}
          </h2>
          <div className="text-[13px] text-brand-muted mt-0.5">
            {venueLocality}
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="px-5 py-16 text-center text-brand-muted">
            Your cart is empty.
            <div className="mt-4">
              <button
                onClick={back}
                className="text-brand-green font-semibold"
              >
                Browse the menu
              </button>
            </div>
          </div>
        ) : (
          <ul>
            {lines.map((line) => (
              <LineRow
                key={line.lineId}
                line={line}
                onInc={() => updateQty(line.lineId, line.quantity + 1)}
                onDec={() => updateQty(line.lineId, line.quantity - 1)}
                onRemove={() => removeLine(line.lineId)}
              />
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <>
            <div className="px-5 py-3 border-b border-gray-100">
              <button
                onClick={back}
                className="inline-flex items-center gap-2 text-brand-ink font-semibold text-[14px] bg-brand-canvas rounded-full px-4 py-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add items
              </button>
            </div>

            <button
              onClick={() => {
                setNoteDraft(note);
                setNoteOpen(true);
              }}
              className="w-full px-5 py-4 border-b border-gray-100 flex items-center gap-3 text-left"
            >
              <NoteIcon className="w-5 h-5 text-brand-ink flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-brand-ink text-[15px]">
                  Add note
                </div>
                {note && (
                  <div className="text-brand-muted text-[13px] mt-0.5 truncate">
                    {note}
                  </div>
                )}
              </div>
              <ChevronRightIcon className="w-5 h-5 text-brand-muted" />
            </button>

            <PromoRow
              codeMatch={codeMatch}
              autoPromo={autoPromo}
              discount={discount}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              subtotal={subtotal}
              applyCode={applyCode}
            />

            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <span className="text-brand-muted text-[14px]">Subtotal</span>
              <span className="text-brand-ink text-[14px] tabular-nums">
                {formatRM(subtotal)}
              </span>
            </div>
            {discount > 0 && activePromo && (
              <div className="px-5 pb-2 flex items-center justify-between">
                <span className="text-brand-green text-[14px]">
                  Discount · {activePromo.label}
                </span>
                <span className="text-brand-green text-[14px] tabular-nums">
                  -{formatRM(discount)}
                </span>
              </div>
            )}
            <div className="px-5 pb-5 flex items-center justify-between">
              <span className="text-brand-ink text-[16px] font-semibold">
                Estimated total
              </span>
              <span className="text-brand-ink text-[16px] font-bold tabular-nums">
                {formatRM(Math.max(0, subtotal - discount))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Sticky checkout */}
      {lines.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
          <button
            onClick={() => go({ name: "checkout" })}
            className="w-full bg-brand-ink text-white rounded-full py-3.5 font-semibold"
          >
            Go to checkout · {formatRM(Math.max(0, subtotal - discount))}
          </button>
        </div>
      )}

      {noteOpen && (
        <NoteModal
          value={noteDraft}
          onChange={setNoteDraft}
          onSave={() => {
            setNote(noteDraft);
            setNoteOpen(false);
          }}
          onCancel={() => setNoteOpen(false)}
        />
      )}
    </div>
  );
}

function LineRow({
  line,
  onInc,
  onDec,
  onRemove,
}: {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const choiceChips: string[] = [];
  if (line.size) choiceChips.push(line.size.label);
  if (line.heat) choiceChips.push(line.heat);
  if (line.dip) choiceChips.push(line.dip);
  if (line.side) choiceChips.push(line.side);
  for (const a of line.addons) choiceChips.push(a.label);

  const lineTotal = line.unitPrice * line.quantity;

  return (
    <li className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-brand-ink text-[15px]">
          {line.item.name}
        </div>
        {choiceChips.length > 0 && (
          <div className="text-brand-muted text-[12px] mt-1 leading-snug">
            {choiceChips.join(" · ")}
          </div>
        )}
        {line.itemNote && (
          <div className="text-brand-muted text-[12px] mt-1 italic leading-snug">
            "{line.itemNote}"
          </div>
        )}
        {line.unavailableAction === "call" && (
          <div className="text-brand-muted text-[11.5px] mt-1 leading-snug">
            If unavailable: call me
          </div>
        )}
        <div className="text-brand-ink text-[14px] mt-1.5">
          {formatRM(lineTotal)}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            aria-label="Decrease"
            onClick={line.quantity === 1 ? onRemove : onDec}
            className="w-8 h-8 rounded-full bg-brand-canvas flex items-center justify-center text-brand-ink"
          >
            {line.quantity === 1 ? (
              <TrashIcon className="w-4 h-4" />
            ) : (
              <MinusIcon className="w-4 h-4" />
            )}
          </button>
          <span className="min-w-[18px] text-center text-[14px] font-semibold">
            {line.quantity}
          </span>
          <button
            aria-label="Increase"
            onClick={onInc}
            className="w-8 h-8 rounded-full bg-brand-canvas flex items-center justify-center text-brand-ink"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function PromoRow({
  codeMatch,
  autoPromo,
  discount,
  promoCode,
  setPromoCode,
  subtotal,
  applyCode,
}: {
  codeMatch: ReturnType<typeof usePromos>["promos"][number] | null;
  autoPromo: ReturnType<typeof usePromos>["promos"][number] | null;
  discount: number;
  promoCode: string | null;
  setPromoCode: (v: string | null) => void;
  subtotal: number;
  applyCode: ReturnType<typeof usePromos>["applyCode"];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onApply = () => {
    setError(null);
    const result = applyCode(draft, subtotal);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setPromoCode(result.promo.code ?? "");
    setOpen(false);
    setDraft("");
  };

  if (codeMatch) {
    return (
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
          <CheckIcon className="w-4 h-4 text-brand-green" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-brand-ink text-[15px]">
            {codeMatch.label}
          </div>
          <div className="text-brand-green text-[12.5px]">
            -{formatRM(discount)} applied
          </div>
        </div>
        <button
          onClick={() => setPromoCode(null)}
          className="text-brand-muted text-[13px] font-semibold"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-100">
      {autoPromo && (
        <div className="px-5 pt-3 pb-1 flex items-center gap-2 text-[12.5px] text-brand-green">
          <CheckIcon className="w-3.5 h-3.5" />
          <span>
            <span className="font-semibold">{autoPromo.label}</span> applied
            automatically · -{formatRM(discount)}
          </span>
        </div>
      )}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full px-5 py-4 flex items-center gap-3 text-left"
        >
          <div className="w-5 h-5 flex items-center justify-center text-brand-ink flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-brand-ink text-[15px]">
              Add promo code
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-brand-muted" />
        </button>
      ) : (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
              placeholder="Enter code"
              className="flex-1 bg-brand-canvas rounded-lg px-3 py-2.5 text-[14px] tracking-wide font-semibold text-brand-ink placeholder:text-brand-muted placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <button
              onClick={onApply}
              className="bg-brand-ink text-white rounded-lg px-4 py-2.5 font-semibold text-[14px]"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setDraft("");
                setError(null);
              }}
              className="text-brand-muted text-[13px] font-semibold px-1"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="text-red-600 text-[12.5px] mt-2">{error}</div>
          )}
          {promoCode === null && !error && (
            <div className="text-brand-muted text-[12px] mt-2">
              Try <span className="font-semibold text-brand-ink">SHAQ20</span>{" "}
              or <span className="font-semibold text-brand-ink">FOWL10</span>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteModal({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/40">
      <div className="bg-white w-full rounded-t-2xl p-5 animate-[slideUp_0.2s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onCancel} className="text-brand-muted">
            Cancel
          </button>
          <div className="font-semibold">Note to restaurant</div>
          <button onClick={onSave} className="text-brand-green font-semibold">
            Save
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="E.g. extra napkins, leave at door, etc."
          className="w-full h-28 border border-gray-200 rounded-lg p-3 text-[14px] focus:outline-none focus:border-brand-green"
        />
      </div>
    </div>
  );
}
