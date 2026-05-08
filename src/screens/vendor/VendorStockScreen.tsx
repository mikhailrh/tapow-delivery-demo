import { useMemo, useState } from "react";
import { useVendorNav } from "../../context/VendorNavContext";
import { useStock } from "../../context/StockContext";
import { useVenue } from "../../context/VenueContext";
import { BackIcon, RotateIcon, SearchIcon, CloseIcon } from "../../components/icons";

export default function VendorStockScreen() {
  const { back } = useVendorNav();
  const { state, toggleItem, bringEverythingBack } = useStock();
  const venue = useVenue();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venue.menu
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) =>
          q
            ? `${i.name} ${i.description ?? ""}`.toLowerCase().includes(q)
            : true,
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [query, venue.menu]);

  const totalItems = useMemo(
    () => venue.menu.reduce((s, c) => s + c.items.length, 0),
    [venue.menu],
  );
  const disabledCount = state.disabledItemIds.length;

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-4 lg:px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={back} aria-label="Back" className="p-1 -ml-1">
          <BackIcon className="w-6 h-6 text-brand-ink" />
        </button>
        <div className="flex-1">
          <div className="text-[16px] font-bold text-brand-ink leading-tight">
            Stock
          </div>
          <div className="text-[11.5px] text-brand-muted">
            {totalItems - disabledCount} of {totalItems} items available
          </div>
        </div>
        {disabledCount > 0 && (
          <button
            onClick={bringEverythingBack}
            className="inline-flex items-center gap-1.5 bg-brand-canvas rounded-full px-3 py-1.5 text-[12px] font-semibold text-brand-ink"
          >
            <RotateIcon className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="px-4 lg:px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-brand-canvas rounded-full px-3.5 py-2">
          <SearchIcon className="w-4 h-4 text-brand-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu items"
            className="flex-1 bg-transparent text-[13.5px] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="w-5 h-5 rounded-full bg-brand-muted/40 flex items-center justify-center"
            >
              <CloseIcon className="w-3 h-3 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {matches.map((cat) => (
          <section key={cat.id} className="mt-4">
            <div className="px-4 lg:px-5 pb-2 text-[11px] font-extrabold text-brand-muted uppercase tracking-wide">
              {cat.name}
            </div>
            <div className="border-t border-gray-100">
              {cat.items.map((item) => {
                const disabled = state.disabledItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center px-4 lg:px-5 py-3 border-b border-gray-50 hover:bg-brand-canvas/60 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={
                          "text-[14px] font-semibold truncate " +
                          (disabled
                            ? "text-brand-muted line-through"
                            : "text-brand-ink")
                        }
                      >
                        {item.name}
                      </div>
                      <div
                        className={
                          "text-[11.5px] " +
                          (disabled ? "text-red-500" : "text-brand-muted")
                        }
                      >
                        {disabled ? "Sold out today" : "Available"}
                      </div>
                    </div>
                    <Switch on={!disabled} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {matches.length === 0 && (
          <div className="px-5 pt-12 text-center text-brand-muted text-[14px]">
            {venue.menu.length === 0 ? "No menu yet." : "No items match."}
          </div>
        )}
      </div>
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={
        "relative inline-block w-9 h-5 rounded-full transition-colors flex-shrink-0 ml-3 " +
        (on ? "bg-brand-green" : "bg-gray-300")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-4" : "translate-x-0")
        }
      />
    </span>
  );
}
