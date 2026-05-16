import { useEffect, useState } from "react";
import { usePerspective } from "../context/PerspectiveContext";
import { useOrders } from "../context/OrdersContext";
import { useStore } from "../context/StoreContext";
import { useStock } from "../context/StockContext";
import { unlockAudio } from "../lib/sound";
import { scopedKey } from "../lib/sync";
import { CloseIcon, BellIcon, BellOffIcon, RotateIcon } from "./icons";

const SOUND_SUFFIX = "demo.soundOn";

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(scopedKey(SOUND_SUFFIX)) === "1";
  });

  useEffect(() => {
    try {
      localStorage.setItem(scopedKey(SOUND_SUFFIX), enabled ? "1" : "0");
    } catch {
      /* quota / SSR */
    }
    if (enabled) unlockAudio();
  }, [enabled]);

  return [enabled, setEnabled] as const;
}

export default function DemoControls() {
  const { perspective, setPerspective } = usePerspective();
  const { orders, resetAll, hasOrders } = useOrders();
  const {
    state: storeState,
    setOpen,
    setForceOpenForDemo,
    isOutsideHours,
  } = useStore();
  const { bringEverythingBack } = useStock();
  const [open, setOpen_] = useState(false);
  const [sound, setSound] = useSoundEnabled();

  const incomingCount = orders.filter((o) => o.status === "incoming").length;

  return (
    <>
      {/* Pull tab */}
      <button
        onClick={() => setOpen_((v) => !v)}
        aria-label="Demo controls"
        className="fixed top-1/2 -translate-y-1/2 right-0 z-40 bg-brand-ink text-white text-[11px] font-semibold tracking-wide uppercase px-2 py-3 rounded-l-lg shadow-lg"
        style={{ writingMode: "vertical-rl", transform: "translateY(-50%)" }}
      >
        Demo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Close demo controls"
            onClick={() => setOpen_(false)}
            className="flex-1 bg-black/40"
          />
          <div
            className="w-[320px] max-w-full h-full bg-white shadow-2xl flex flex-col"
            style={{ animation: "drawerInRight 0.22s ease-out" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="text-[15px] font-bold text-brand-ink">
                Demo controls
              </div>
              <button
                onClick={() => setOpen_(false)}
                aria-label="Close"
                className="p-1 -mr-1"
              >
                <CloseIcon className="w-6 h-6 text-brand-ink" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Section label="Perspective">
                <div className="flex flex-col gap-1.5">
                  <PerspectiveRow
                    label="Customer"
                    sub="Diner ordering · phone"
                    active={perspective === "customer"}
                    onClick={() => setPerspective("customer")}
                  />
                  <PerspectiveRow
                    label="Vendor"
                    sub="Kitchen tablet · operates"
                    active={perspective === "vendor"}
                    onClick={() => setPerspective("vendor")}
                  />
                  <PerspectiveRow
                    label="Manager"
                    sub="Owner phone · oversees"
                    active={perspective === "manager"}
                    onClick={() => setPerspective("manager")}
                  />
                </div>
                <p className="text-[11.5px] text-brand-muted mt-2 leading-snug">
                  Toggle is per-tab. Open multiple windows to demo perspectives
                  side-by-side.
                </p>
              </Section>

              <Section label="Sound">
                <button
                  onClick={() => setSound(!sound)}
                  className="w-full flex items-center justify-between bg-brand-canvas rounded-xl px-3.5 py-3 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {sound ? (
                      <BellIcon className="w-[18px] h-[18px] text-brand-ink" />
                    ) : (
                      <BellOffIcon className="w-[18px] h-[18px] text-brand-muted" />
                    )}
                    <div>
                      <div className="text-[13.5px] font-semibold text-brand-ink">
                        Vendor chimes
                      </div>
                      <div className="text-[11px] text-brand-muted">
                        Two-note ping on incoming orders
                      </div>
                    </div>
                  </div>
                  <Switch on={sound} />
                </button>
              </Section>

              <Section label="Hours override">
                <button
                  onClick={() =>
                    setForceOpenForDemo(!storeState.forceOpenForDemo)
                  }
                  className="w-full flex items-center justify-between bg-brand-canvas rounded-xl px-3.5 py-3 text-left"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-[13.5px] font-semibold text-brand-ink">
                      Force open
                    </div>
                    <div className="text-[11px] text-brand-muted leading-snug">
                      Bypass clock-based off-hours so the customer flow runs
                      anytime. Manual paused / closing-today still apply.
                    </div>
                  </div>
                  <Switch on={storeState.forceOpenForDemo} />
                </button>
                {!storeState.forceOpenForDemo && isOutsideHours && (
                  <p className="text-[11.5px] text-red-700 mt-2 leading-snug">
                    Currently outside venue hours — checkout is blocked. Flip
                    this on to demo through it.
                  </p>
                )}
              </Section>

              <Section label="Demo data">
                <div className="rounded-xl bg-brand-canvas p-3 space-y-2">
                  <Row k="Orders in system" v={orders.length} />
                  <Row k="Incoming" v={incomingCount} />
                  <Row
                    k="Store status"
                    v={
                      storeState.closingToday
                        ? "Closing today"
                        : storeState.status
                    }
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      resetAll(true);
                      setOpen();
                      bringEverythingBack();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-brand-ink text-white rounded-full py-2.5 text-[13px] font-semibold"
                  >
                    <RotateIcon className="w-4 h-4" />
                    Seed history
                  </button>
                  {hasOrders && (
                    <button
                      onClick={() => {
                        resetAll(false);
                        setOpen();
                        bringEverythingBack();
                      }}
                      className="w-full bg-white border border-gray-200 text-brand-ink rounded-full py-2.5 text-[13px] font-semibold"
                    >
                      Wipe all orders
                    </button>
                  )}
                </div>
              </Section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-5 pb-2">
      <div className="text-[11px] font-semibold text-brand-muted uppercase tracking-wide mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function PerspectiveRow({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left border transition-colors " +
        (active
          ? "bg-brand-ink text-white border-brand-ink"
          : "bg-brand-canvas text-brand-ink border-transparent")
      }
    >
      <div>
        <div className="text-[13.5px] font-bold">{label}</div>
        <div
          className={
            "text-[11px] " + (active ? "text-white/70" : "text-brand-muted")
          }
        >
          {sub}
        </div>
      </div>
      {active && (
        <span className="text-[10.5px] font-bold uppercase tracking-wide opacity-70">
          Active
        </span>
      )}
    </button>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={
        "relative inline-block w-9 h-5 rounded-full transition-colors flex-shrink-0 " +
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-brand-muted">{k}</span>
      <span className="font-semibold text-brand-ink capitalize">{v}</span>
    </div>
  );
}
