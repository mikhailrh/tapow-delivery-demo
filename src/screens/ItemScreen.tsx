import { useMemo, useState } from "react";
import type { ModifierGroup } from "../data/menu";
import {
  computeUnitPrice,
  useCart,
  type Selections,
  type UnavailableAction,
} from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useStock } from "../context/StockContext";
import { useVenue } from "../context/VenueContext";
import { formatRM } from "../lib/money";
import { ChevronDownIcon, CloseIcon, HeartIcon } from "../components/icons";
import {
  readDishFavourites,
  toggleDishFavourite,
} from "../lib/dishFavourites";

function defaultSelections(groups: ModifierGroup[] | undefined): Selections {
  const out: Selections = {};
  if (!groups) return out;
  for (const g of groups) {
    if (!g.multi && g.required && g.options[0]) {
      out[g.id] = [g.options[0].id];
    } else {
      out[g.id] = [];
    }
  }
  return out;
}

export default function ItemScreen({ itemId }: { itemId: string }) {
  const { back } = useNav();
  const { addLine } = useCart();
  const { isItemAvailable } = useStock();
  const venue = useVenue();

  const item = useMemo(() => {
    for (const cat of venue.menu) {
      const found = cat.items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }, [itemId, venue.menu]);

  const [selections, setSelections] = useState<Selections>(() =>
    defaultSelections(item?.modifierGroups),
  );
  const [itemNote, setItemNote] = useState("");
  const [unavailableAction, setUnavailableAction] =
    useState<UnavailableAction>("remove");
  const [qty, setQty] = useState(1);
  const [isFavourite, setIsFavourite] = useState(() =>
    readDishFavourites().has(itemId),
  );
  const toggleFav = () => {
    const next = toggleDishFavourite(itemId);
    setIsFavourite(next.has(itemId));
  };

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

  const unitPrice = computeUnitPrice(item, selections);
  const itemAvailable = isItemAvailable(item.id);

  const groupValid = (g: ModifierGroup): boolean => {
    const sel = selections[g.id] ?? [];
    if (g.required && sel.length === 0) return false;
    if (g.multi && g.max != null && sel.length > g.max) return false;
    return true;
  };
  const allValid = (item.modifierGroups ?? []).every(groupValid);
  const canAdd = allValid && itemAvailable;

  const setSingle = (groupId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [groupId]: [optionId] }));
  };

  const toggleMulti = (group: ModifierGroup, optionId: string) => {
    setSelections((prev) => {
      const cur = prev[group.id] ?? [];
      const has = cur.includes(optionId);
      let next: string[];
      if (has) {
        next = cur.filter((x) => x !== optionId);
      } else {
        if (group.max != null && cur.length >= group.max) {
          // Replace the oldest selection when at max — feels closer to a
          // "select up to N" dropdown than refusing the click.
          next = [...cur.slice(1), optionId];
        } else {
          next = [...cur, optionId];
        }
      }
      return { ...prev, [group.id]: next };
    });
  };

  const onAdd = () => {
    if (!canAdd) return;
    const trimmedNote = itemNote.trim();
    addLine({
      item,
      selections,
      unitPrice,
      quantity: qty,
      ...(trimmedNote ? { itemNote: trimmedNote } : {}),
      ...(unavailableAction !== "remove" ? { unavailableAction } : {}),
    });
    back();
  };

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <button
        onClick={back}
        aria-label="Close"
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md"
      >
        <CloseIcon className="w-5 h-5 text-brand-ink" />
      </button>
      <button
        onClick={toggleFav}
        aria-label={isFavourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
        aria-pressed={isFavourite}
        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md"
      >
        <HeartIcon
          filled={isFavourite}
          className={
            "w-5 h-5 " + (isFavourite ? "text-rose-500" : "text-brand-ink")
          }
        />
      </button>

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
            {formatRM(item.price)}
          </div>
          {item.description && (
            <p className="text-brand-muted text-[14px] mt-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {(item.modifierGroups ?? []).map((group) => (
          <ModifierGroupSection
            key={group.id}
            group={group}
            selections={selections[group.id] ?? []}
            onPickSingle={(optId) => setSingle(group.id, optId)}
            onToggleMulti={(optId) => toggleMulti(group, optId)}
          />
        ))}

        <Section title="Any requests?" optional>
          <div className="py-3">
            <textarea
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="Extra sauce, less spice, no drama."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-brand-ink placeholder:text-brand-muted resize-none outline-none focus:border-brand-ink min-h-[88px]"
              maxLength={200}
            />
          </div>
        </Section>

        <Section title="If this item is not available" compact>
          <div className="py-3">
            <div className="relative">
              <select
                value={unavailableAction}
                onChange={(e) =>
                  setUnavailableAction(e.target.value as UnavailableAction)
                }
                className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 pr-10 text-[14px] text-brand-ink bg-white outline-none focus:border-brand-ink cursor-pointer"
              >
                <option value="remove">Remove it from my order</option>
                <option value="call">Call me</option>
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
            </div>
          </div>
        </Section>

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
          {!itemAvailable
            ? "Currently unavailable"
            : canAdd
              ? `Add ${qty} to cart · ${formatRM(unitPrice * qty)}`
              : "Make your selections"}
        </button>
      </div>
    </div>
  );
}

function ModifierGroupSection({
  group,
  selections,
  onPickSingle,
  onToggleMulti,
}: {
  group: ModifierGroup;
  selections: string[];
  onPickSingle: (optionId: string) => void;
  onToggleMulti: (optionId: string) => void;
}) {
  const isMulti = !!group.multi;
  const subtitle = isMulti && group.max != null ? `Select up to ${group.max}` : undefined;
  return (
    <Section
      title={group.label}
      subtitle={subtitle}
      required={group.required}
      optional={!group.required}
    >
      {group.options.map((opt) => {
        const checked = selections.includes(opt.id);
        const priceText =
          opt.priceDelta && opt.priceDelta > 0
            ? opt.perPiece
              ? `+${formatRM(opt.priceDelta)} per piece`
              : `+${formatRM(opt.priceDelta)}`
            : undefined;
        return (
          <OptionRow
            key={opt.id}
            type={isMulti ? "checkbox" : "radio"}
            label={opt.label}
            price={priceText}
            checked={checked}
            onChange={() =>
              isMulti ? onToggleMulti(opt.id) : onPickSingle(opt.id)
            }
          />
        );
      })}
    </Section>
  );
}

function Section({
  title,
  subtitle,
  required,
  optional,
  compact,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  optional?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const showOptional = optional && !required;
  return (
    <section className={compact ? "mt-3" : "mt-6"}>
      <div className="px-5 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-brand-ink">{title}</h2>
          {subtitle && (
            <div className="text-[12px] text-brand-muted">{subtitle}</div>
          )}
        </div>
        {required && (
          <span className="text-[11px] font-semibold text-brand-muted bg-gray-100 rounded-full px-2.5 py-0.5">
            Required
          </span>
        )}
        {showOptional && (
          <span className="text-[11px] font-semibold text-brand-muted bg-gray-100 rounded-full px-2.5 py-0.5">
            Optional
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
            "text-[15px] " +
            (disabled ? "text-brand-muted line-through" : "text-brand-ink")
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
