import { useMemo, useState } from "react";
import {
  DIPS,
  HEAT_LEVELS,
  SIDES,
  type DipType,
  type HeatLevel,
  type OptionalAddon,
  type SideType,
  type SizeVariant,
} from "../data/menu";
import { computeUnitPrice, useCart } from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useStock } from "../context/StockContext";
import { useVenue } from "../context/VenueContext";
import { formatRM } from "../lib/money";
import { CloseIcon } from "../components/icons";

export default function ItemScreen({ itemId }: { itemId: string }) {
  const { back } = useNav();
  const { addLine } = useCart();
  const { isHeatAvailable } = useStock();
  const venue = useVenue();

  const item = useMemo(() => {
    for (const cat of venue.menu) {
      const found = cat.items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }, [itemId, venue.menu]);

  const [size, setSize] = useState<SizeVariant | undefined>(
    item?.sizes ? item.sizes[0] : undefined,
  );
  const [heat, setHeat] = useState<HeatLevel | undefined>(undefined);
  const [dip, setDip] = useState<DipType | undefined>(undefined);
  const [side, setSide] = useState<SideType | undefined>(undefined);
  const [addons, setAddons] = useState<OptionalAddon[]>([]);
  const [qty, setQty] = useState(1);

  if (!item) {
    return (
      <div className="p-6">
        Item not found.{" "}
        <button className="text-brand-green underline" onClick={back}>
          Go back
        </button>
      </div>
    );
  }

  const pieces = size?.pieces ?? 1;
  const heatMeta = heat ? HEAT_LEVELS.find((h) => h.label === heat) : undefined;
  const heatUpcharge = heatMeta?.upcharge ?? 0;

  const unitPrice = computeUnitPrice(item, size, heatUpcharge, pieces, addons);

  const toggleAddon = (a: OptionalAddon) => {
    setAddons((prev) =>
      prev.some((x) => x.id === a.id)
        ? prev.filter((x) => x.id !== a.id)
        : [...prev, a],
    );
  };

  // Validation
  const comboComplete = !item.combo || (!!heat && !!dip && !!side);
  const heatOnlyComplete = !item.heatOnly || !!heat;
  const canAdd = comboComplete && heatOnlyComplete;

  const onAdd = () => {
    if (!canAdd) return;
    addLine({
      item,
      size,
      heat,
      heatUpcharge,
      dip,
      side,
      addons,
      unitPrice,
      quantity: qty,
    });
    back();
  };

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      {/* Floating close button — sits over the hero image when present, over white otherwise */}
      <button
        onClick={back}
        aria-label="Close"
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md"
      >
        <CloseIcon className="w-5 h-5 text-brand-ink" />
      </button>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-36">
        {item.image && (
          <div className="w-full aspect-[4/3] bg-brand-canvas">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className={"px-5 " + (item.image ? "pt-5" : "pt-14")}>
          <h1 className="text-[26px] font-bold text-brand-ink leading-tight">
            {item.name}
          </h1>
          <div className="text-brand-ink text-[17px] mt-1">
            {formatRM(item.sizes ? item.sizes[0].price : item.price)}
          </div>
          {item.description && (
            <p className="text-brand-muted text-[14px] mt-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Size selector */}
        {item.sizes && item.sizes.length > 1 && (
          <Section title="Pick a size" required>
            {item.sizes.map((s) => (
              <OptionRow
                key={s.id}
                type="radio"
                label={s.label}
                price={
                  s.price !== (item.sizes?.[0].price ?? 0)
                    ? `+${formatRM(s.price - (item.sizes?.[0].price ?? 0))}`
                    : formatRM(s.price)
                }
                checked={size?.id === s.id}
                onChange={() => setSize(s)}
              />
            ))}
          </Section>
        )}

        {/* Fried chicken: Heat */}
        {(item.combo || item.heatOnly) && (
          <Section title="Heat" required>
            {HEAT_LEVELS.map((h) => {
              const available = isHeatAvailable(h.label);
              return (
                <OptionRow
                  key={h.label}
                  type="radio"
                  label={available ? h.label : `${h.label} · sold out`}
                  price={
                    h.upcharge > 0
                      ? `+${formatRM(h.upcharge)} per piece`
                      : undefined
                  }
                  checked={heat === h.label}
                  disabled={!available}
                  onChange={() => available && setHeat(h.label)}
                />
              );
            })}
          </Section>
        )}

        {/* Fried chicken: Dip */}
        {item.combo && (
          <Section title="Dip" required>
            {DIPS.map((d) => (
              <OptionRow
                key={d}
                type="radio"
                label={d}
                checked={dip === d}
                onChange={() => setDip(d)}
              />
            ))}
          </Section>
        )}

        {/* Fried chicken: Side */}
        {item.combo && (
          <Section title="Pick 1 side" required>
            {SIDES.map((s) => (
              <OptionRow
                key={s}
                type="radio"
                label={s}
                checked={side === s}
                onChange={() => setSide(s)}
              />
            ))}
            <div className="py-3 px-1 text-[13px] text-brand-muted">
              Biscuit included ✓
            </div>
          </Section>
        )}

        {/* Optional addons */}
        {item.addons && item.addons.length > 0 && (
          <Section title="Add extras" subtitle="Optional">
            {item.addons.map((a) => (
              <OptionRow
                key={a.id}
                type="checkbox"
                label={a.label}
                price={`+${formatRM(a.price)}`}
                checked={addons.some((x) => x.id === a.id)}
                onChange={() => toggleAddon(a)}
              />
            ))}
          </Section>
        )}

        {/* Quantity stepper */}
        <div className="px-5 pt-6 flex items-center justify-center gap-5">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-brand-ink text-xl"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[28px] text-center text-[18px] font-semibold">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-brand-ink text-xl"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Sticky add-to-cart */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
        <button
          disabled={!canAdd}
          onClick={onAdd}
          className={
            "w-full rounded-full py-3.5 px-5 font-semibold transition-colors " +
            (canAdd
              ? "bg-brand-ink text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed")
          }
        >
          {canAdd
            ? `Add ${qty} to cart · ${formatRM(unitPrice * qty)}`
            : "Make your selections"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="px-5 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-brand-ink">{title}</h2>
          {subtitle && (
            <div className="text-[12px] text-brand-muted">{subtitle}</div>
          )}
        </div>
        {required && (
          <span className="text-[11px] font-semibold text-brand-muted bg-gray-100 rounded px-2 py-0.5">
            Required
          </span>
        )}
      </div>
      <div className="bg-brand-canvas">
        <div className="bg-white mx-0 px-5">{children}</div>
      </div>
    </section>
  );
}

function OptionRow({
  type,
  label,
  price,
  checked,
  onChange,
  disabled,
}: {
  type: "radio" | "checkbox";
  label: string;
  price?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        "flex items-center py-3 border-b border-gray-100 last:border-b-0 " +
        (disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")
      }
    >
      <div className="flex-1">
        <div
          className={
            "text-[15px] " + (disabled ? "text-brand-muted line-through" : "text-brand-ink")
          }
        >
          {label}
        </div>
        {price && (
          <div className="text-brand-muted text-[12px] mt-0.5">{price}</div>
        )}
      </div>
      <span className="relative flex items-center justify-center w-5 h-5">
        <input
          type={type}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <span
          className={
            "w-5 h-5 flex items-center justify-center transition-colors " +
            (type === "radio"
              ? "rounded-full border-2 "
              : "rounded border-2 ") +
            (checked ? "border-brand-green" : "border-gray-300")
          }
        >
          {checked && type === "radio" && (
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
          )}
          {checked && type === "checkbox" && (
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 text-brand-green"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
      </span>
    </label>
  );
}
