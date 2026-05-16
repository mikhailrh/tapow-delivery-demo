import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useNav } from "../context/NavContext";
import { useOrders } from "../context/OrdersContext";
import { useStore } from "../context/StoreContext";
import { useVenue } from "../context/VenueContext";
import { useVenueProfile } from "../context/VenueProfileContext";
import { formatRM } from "../lib/money";
import {
  calculateOrderCustomerEta,
  countThreadImages,
  getChatPhase,
  lifecycleLabel,
  MAX_IMAGES_PER_THREAD,
  type ChatPhase,
  type LifecycleLine,
  type Order,
  type OrderMessage,
} from "../lib/orders";
import { compressImageToDataUrl } from "../lib/imageCompress";
import { calculateSavings } from "../lib/pricing";
import { openPrintableReceipt } from "../lib/receipt";
import { BackIcon, PaperclipIcon, PhoneIcon, VideoIcon } from "../components/icons";

const WA_HEADER = "#075E54";
const WA_CHAT_BG = "#ECE5DD";
const WA_BUBBLE_IN = "#FFFFFF";

export default function WhatsAppScreen({
  orderId,
}: {
  orderId?: string;
}) {
  const { go } = useNav();
  const { clear } = useCart();
  const { getById, cancelOrder, sendCustomerMessage, promoteMessageToReview } =
    useOrders();
  const { state: storeState } = useStore();
  const { profile } = useVenueProfile();
  const venue = useVenue();
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Orders persist in OrdersContext (cleared only via Demo controls) so we
  // can read live by id — no snapshot needed.
  const stable = orderId ? getById(orderId) : undefined;

  // Timeline merges system-event bubbles (`statusUpdates` after the first
  // "received" event, which is rolled into the receipt bubble) with chat
  // messages, time-sorted, so they reveal in natural reading order.
  type TimelineItem =
    | { kind: "status"; at: number; text: string; idx: number }
    | { kind: "message"; at: number; message: OrderMessage };
  const timeline = useMemo<TimelineItem[]>(() => {
    if (!stable) return [];
    const statusItems: TimelineItem[] = (stable.statusUpdates ?? [])
      .slice(1)
      .map((u, i) => ({ kind: "status", at: u.at, text: u.text, idx: i }));
    const messageItems: TimelineItem[] = (stable.messages ?? []).map((m) => ({
      kind: "message",
      at: m.at,
      message: m,
    }));
    return [...statusItems, ...messageItems].sort((a, b) => a.at - b.at);
  }, [stable]);

  const [bubbleCount, setBubbleCount] = useState(1);

  // Reveal one timeline item at a time so the demo flows; bubbleCount = 1
  // means the receipt is visible but nothing else yet.
  useEffect(() => {
    if (!stable) return;
    const total = 1 + timeline.length;
    if (bubbleCount < total) {
      const t = setTimeout(() => setBubbleCount((n) => n + 1), 700);
      return () => clearTimeout(t);
    }
  }, [stable, bubbleCount, timeline.length]);

  const [showSavings, setShowSavings] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowSavings(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const savings = useMemo(() => {
    if (!stable) return 0;
    return calculateSavings(
      stable.subtotal,
      stable.deliveryFee,
      stable.serviceCharge + stable.sst,
    );
  }, [stable]);

  const totalEta = stable
    ? calculateOrderCustomerEta(stable, storeState.kitchenPrepMinutes)
    : 0;

  const startOver = () => {
    clear();
    go({ name: "menu" });
  };

  if (!stable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[15px] text-brand-muted">No order to display.</p>
        <button
          onClick={() => go({ name: "menu" })}
          className="mt-4 bg-brand-green hover:bg-brand-greenDeep active:bg-brand-greenDeep text-white rounded-full px-5 py-2.5 font-semibold text-[14px] transition-colors"
        >
          Back to menu
        </button>
      </div>
    );
  }

  // Receipt is bubble 1; subsequent items map 1:1 to `timeline` indices.
  const itemsToShow = timeline.slice(0, Math.max(0, bubbleCount - 1));

  const chatPhase: ChatPhase = getChatPhase(stable);
  const stableId = stable.id;

  // ----- Step 8: scroll tracking → preview banner for unread vendor msgs -----
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => Date.now());
  const [isAtBottom, setIsAtBottom] = useState(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsAtBottom(dist < 80);
  };

  // While the user's at the bottom, any new bubble is considered seen — so
  // the banner only shows when they've scrolled away from the conversation.
  useEffect(() => {
    if (isAtBottom) setLastSeenAt(Date.now());
  }, [isAtBottom, itemsToShow.length]);

  const unreadVendorMessages = useMemo(() => {
    const out: OrderMessage[] = [];
    for (const it of itemsToShow) {
      if (
        it.kind === "message" &&
        it.message.from === "vendor" &&
        it.at > lastSeenAt
      )
        out.push(it.message);
    }
    return out;
  }, [itemsToShow, lastSeenAt]);

  const showPreviewBanner = !isAtBottom && unreadVendorMessages.length > 0;
  const latestUnread = unreadVendorMessages[unreadVendorMessages.length - 1];

  const dismissBanner = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setLastSeenAt(Date.now());
  };

  // ----- Step 7: image attach (customer side) -----
  const attachImage = useCallback(
    async (file: File): Promise<string | null> => {
      const current = stable ? countThreadImages(stable) : 0;
      if (current >= MAX_IMAGES_PER_THREAD) {
        return `Max ${MAX_IMAGES_PER_THREAD} images per thread. Drop a follow-up in text.`;
      }
      try {
        const { dataUrl } = await compressImageToDataUrl(file);
        sendCustomerMessage(stableId, { image: dataUrl });
        return null;
      } catch {
        return "Couldn't read that image. Try another one.";
      }
    },
    [stable, stableId, sendCustomerMessage],
  );

  const imageCount = countThreadImages(stable);
  const atImageCap = imageCount >= MAX_IMAGES_PER_THREAD;

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      style={{ background: WA_CHAT_BG }}
    >
      <div
        className="flex items-center px-3 py-3 text-white"
        style={{ background: WA_HEADER }}
      >
        <button
          onClick={startOver}
          aria-label="Back"
          className="p-1 -ml-1"
        >
          <BackIcon className="w-6 h-6 text-white" />
        </button>
        <div className="w-9 h-9 rounded-full bg-white/20 ml-2 flex items-center justify-center text-[15px] font-bold">
          🐔
        </div>
        <div className="ml-3 flex-1">
          <div className="font-semibold text-[15px] leading-tight">
            tapow.my
          </div>
          <div className="text-[11px] opacity-80 leading-tight">online</div>
        </div>
        <VideoIcon className="w-5 h-5 mr-3 opacity-90" />
        <PhoneIcon className="w-5 h-5 opacity-90" />
      </div>

      <OrderStatusLine order={stable} venueName={venue.name} />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-4 pb-28"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(0,0,0,0.03) 0%, transparent 30%), radial-gradient(circle at 80% 60%, rgba(0,0,0,0.03) 0%, transparent 30%)",
        }}
      >
        <DateChip label="Today" />

        <Bubble time={formatTime(stable.placedAt)} side="in">
          <div className="font-semibold text-[14px] mb-1.5">
            Thanks for your order! 🐔
          </div>
          <div className="text-[13px] text-brand-ink/90 mb-2">
            We got it — here's your receipt:
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-[12.5px] space-y-2">
            {stable.lines.map((s, idx) => (
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
              <Row label="Subtotal" value={formatRM(stable.subtotal)} />
              <Row
                label="Service charge (10%)"
                value={formatRM(stable.serviceCharge)}
              />
              <Row label="SST (6%)" value={formatRM(stable.sst)} />
              {stable.deliveryFee > 0 && (
                <Row label="Delivery" value={formatRM(stable.deliveryFee)} />
              )}
              {stable.discount && stable.discount > 0 ? (
                <Row
                  label={
                    <span className="text-brand-green">
                      Discount · {stable.promoCode ?? "Promo"}
                    </span>
                  }
                  value={
                    <span className="text-brand-green">
                      -{formatRM(stable.discount)}
                    </span>
                  }
                />
              ) : null}
              <Row
                label={<span className="font-bold">Total</span>}
                value={
                  <span className="font-bold">{formatRM(stable.total)}</span>
                }
              />
            </div>
          </div>
          <div className="text-[12px] text-brand-muted mt-2">
            Order #{stable.shortId} · Paid · Card •••• 4242
          </div>
          {stable.status !== "cancelled" && stable.status !== "rejected" && (
            <div className="mt-2 bg-brand-green/10 border border-brand-green/30 rounded-lg px-2.5 py-1.5 text-[12px] text-brand-ink">
              <span className="font-semibold">ETA</span>{" "}
              {stable.fulfillment === "delivery"
                ? `~${totalEta} min to your door`
                : `~${totalEta} min for pickup`}
            </div>
          )}
        </Bubble>

        {showSavings && (
          <Bubble time={formatTime(stable.placedAt + 60_000)} side="in">
            <div className="text-[13px] whitespace-pre-line">
              {`(Psst! You saved RM${savings.toFixed(2)} vs the big delivery apps today 👏🏼)`}
            </div>
          </Bubble>
        )}

        {itemsToShow.map((item, i) => {
          if (item.kind === "message") {
            const m = item.message;
            const side = m.from === "vendor" ? "in" : "out";
            const tone = m.from === "vendor" ? "vendor" : "system";
            return (
              <div key={"m:" + m.id}>
                <Bubble time={formatTime(m.at)} side={side} tone={tone}>
                  {m.from === "vendor" && (
                    <div className="text-[10px] font-bold uppercase tracking-wide text-brand-green mb-0.5">
                      {venue.name} kitchen
                    </div>
                  )}
                  {m.image && (
                    <img
                      src={m.image}
                      alt=""
                      className="rounded-lg block max-h-64 w-auto mb-1.5"
                    />
                  )}
                  {m.text && (
                    <div className="text-[13px] whitespace-pre-line">
                      {m.text}
                    </div>
                  )}
                </Bubble>
                {m.from === "customer" && (
                  <ReviewAffordance
                    message={m}
                    chatPhase={chatPhase}
                    order={stable}
                    onPromote={(rating) =>
                      promoteMessageToReview(stable.id, m.id, rating)
                    }
                  />
                )}
              </div>
            );
          }
          const u = item;
          return (
            <Bubble
              key={"s:" + u.at + ":" + i}
              time={formatTime(u.at)}
              side="in"
              tone="system"
            >
              <div className="text-[13px] whitespace-pre-line">{u.text}</div>
              {u.text.toLowerCase().includes("ready") &&
                stable.fulfillment === "delivery" &&
                stable.driver && (
                  <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-brand-ink text-white text-[10.5px] font-bold flex items-center justify-center">
                      {stable.driver.initials}
                    </div>
                    <div className="text-[11.5px]">
                      <div className="font-semibold text-brand-ink">
                        {stable.driver.name}
                      </div>
                      <div className="text-brand-muted">
                        Arriving in ~{stable.driver.etaMinutes} min
                      </div>
                    </div>
                  </div>
                )}
              {stable.status === "rejected" && stable.refundCredit ? (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-[11.5px] text-red-800">
                  RM{stable.refundCredit} apology credit added to your account.
                </div>
              ) : null}
              {/* Refund pill anchors to the status event whose `at` matches
                  the refund record's `requestedAt`. Don't restore the
                  substring sniff — it breaks the demo if refund copy
                  changes. */}
              {stable.refund && u.at === stable.refund.requestedAt ? (
                <div
                  className={
                    "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide " +
                    (stable.refund.status === "processed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800")
                  }
                >
                  <span
                    className={
                      "w-1.5 h-1.5 rounded-full " +
                      (stable.refund.status === "processed"
                        ? "bg-emerald-600"
                        : "bg-amber-600")
                    }
                  />
                  {stable.refund.status === "processed"
                    ? `Refunded ${formatRM(stable.refund.amount)}`
                    : `Refund pending · ${formatRM(stable.refund.amount)}`}
                </div>
              ) : null}
            </Bubble>
          );
        })}

        <div className="flex justify-center mt-8 mb-4 gap-2 flex-wrap">
          {stable.status === "incoming" && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="px-4 py-2 rounded-full bg-white border border-red-200 text-red-700 text-[13px] font-semibold shadow-sm"
            >
              Cancel order
            </button>
          )}
          {stable.status === "collected" && (
            <button
              onClick={() => openPrintableReceipt(stable, profile)}
              className="px-4 py-2 rounded-full bg-white border border-gray-200 text-brand-ink text-[13px] font-semibold shadow-sm"
            >
              Download receipt
            </button>
          )}
          <button
            onClick={startOver}
            className="px-4 py-2 rounded-full bg-white border border-gray-200 text-[13px] font-semibold shadow-sm"
          >
            ↻ Start over
          </button>
        </div>
        <div ref={bottomRef} aria-hidden />
      </div>

      {showPreviewBanner && (
        <UnreadPreviewBanner
          message={latestUnread!}
          venueName={venue.name}
          onClick={dismissBanner}
        />
      )}

      {confirmCancel && (
        <CancelConfirmSheet
          shortId={stable.shortId}
          total={stable.total}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            cancelOrder(stable.id);
            setConfirmCancel(false);
          }}
        />
      )}

      <ChatInput
        placeholder={inputPlaceholderFor(chatPhase, venue.name)}
        onSend={(text) => sendCustomerMessage(stable.id, { text })}
        onAttachImage={attachImage}
        atImageCap={atImageCap}
        disabled={chatPhase === "closed"}
        closedHint={
          chatPhase === "closed"
            ? "This conversation is closed."
            : undefined
        }
      />
    </div>
  );
}

function UnreadPreviewBanner({
  message,
  venueName,
  onClick,
}: {
  message: OrderMessage;
  venueName: string;
  onClick: () => void;
}) {
  const preview = message.text?.trim() || "Sent a photo";
  return (
    <button
      onClick={onClick}
      className="absolute bottom-[60px] left-1/2 -translate-x-1/2 max-w-[88%] bg-white shadow-lg border border-gray-200 rounded-full pl-3 pr-2.5 py-2 flex items-center gap-2 z-30"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-brand-green flex-shrink-0">
        {venueName}
      </span>
      <span className="text-[12px] text-brand-ink truncate max-w-[220px]">
        {preview}
      </span>
      <span className="text-brand-muted text-[14px] leading-none flex-shrink-0">
        ↓
      </span>
    </button>
  );
}

function inputPlaceholderFor(phase: ChatPhase, venueName: string): string {
  switch (phase) {
    case "pre-pickup":
      return `Message ${venueName}`;
    case "in-transit":
      return "Message about your order";
    case "post-delivery":
      return `How was it? Let ${venueName} know`;
    case "closed":
      return "Conversation closed";
  }
}

/**
 * Bottom-pinned chat input. Sends on Enter (Shift+Enter for newline). Doesn't
 * carry framing copy itself — the caller passes `placeholder` so the input
 * can phase-shift in step 5. Paperclip opens a small action picker for the
 * camera or photo album; image attach is hard-capped via `atImageCap` so the
 * order doesn't overflow the localStorage-backed sync channel.
 */
function ChatInput({
  placeholder,
  onSend,
  onAttachImage,
  atImageCap,
  disabled,
  closedHint,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  onAttachImage: (file: File) => Promise<string | null>;
  atImageCap: boolean;
  disabled?: boolean;
  closedHint?: string;
}) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const albumRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const send = () => {
    const t = draft.trim();
    if (!t || disabled) return;
    onSend(t);
    setDraft("");
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    const result = await onAttachImage(file);
    if (result) setError(result);
    setBusy(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-transparent">
      {closedHint && (
        <div className="mb-1.5 text-center text-[11.5px] text-brand-muted">
          {closedHint}
        </div>
      )}
      {error && (
        <div className="mb-1.5 mx-auto max-w-[88%] text-center text-[11.5px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1">
          {error}
        </div>
      )}
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex items-end gap-2 relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Attach image"
          disabled={disabled || busy}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm text-brand-ink disabled:opacity-50"
        >
          <PaperclipIcon className="w-4 h-4" />
        </button>
        {pickerOpen && (
          <AttachmentPicker
            atCap={atImageCap}
            disabled={busy}
            onCamera={() => {
              setPickerOpen(false);
              cameraRef.current?.click();
            }}
            onAlbum={() => {
              setPickerOpen(false);
              albumRef.current?.click();
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-white rounded-full px-4 py-2.5 text-[14px] text-brand-ink placeholder:text-brand-muted shadow-sm outline-none disabled:opacity-60"
        />
        <button
          onClick={send}
          aria-label="Send"
          disabled={disabled || !draft.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{ background: WA_HEADER }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-white"
            fill="currentColor"
          >
            <path d="M3 11l18-8-8 18-2-8-8-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AttachmentPicker({
  atCap,
  disabled,
  onCamera,
  onAlbum,
  onClose,
}: {
  atCap: boolean;
  disabled: boolean;
  onCamera: () => void;
  onAlbum: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        aria-label="Close attachment picker"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        className="absolute left-0 bottom-12 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[180px] overflow-hidden"
        style={{ animation: "fadeIn 0.16s ease-out" }}
      >
        {atCap ? (
          <div className="px-4 py-2 text-[12px] text-brand-muted leading-snug">
            Image cap reached (max {MAX_IMAGES_PER_THREAD} per thread).
          </div>
        ) : (
          <>
            <button
              onClick={onCamera}
              disabled={disabled}
              className="block w-full text-left px-4 py-2.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-canvas/60 disabled:opacity-50"
            >
              Take photo
            </button>
            <button
              onClick={onAlbum}
              disabled={disabled}
              className="block w-full text-left px-4 py-2.5 text-[13px] font-semibold text-brand-ink hover:bg-brand-canvas/60 disabled:opacity-50"
            >
              Choose from album
            </button>
          </>
        )}
      </div>
    </>
  );
}

function CancelConfirmSheet({
  shortId,
  total,
  onClose,
  onConfirm,
}: {
  shortId: string;
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white w-full rounded-t-2xl p-5 shadow-2xl"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <div className="text-[17px] font-bold text-brand-ink">
          Cancel order #{shortId}?
        </div>
        <div className="text-[13.5px] text-brand-muted mt-1.5 leading-relaxed">
          The kitchen hasn't started yet. We'll process a full refund of{" "}
          <span className="font-semibold text-brand-ink">{formatRM(total)}</span>{" "}
          back to your card. Refunds usually take 3–5 business days.
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-brand-canvas text-brand-ink rounded-full py-3 font-semibold text-[14px]"
          >
            Keep order
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white rounded-full py-3 font-semibold text-[14px]"
          >
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pinned strip below the WhatsApp header surfacing the order's lifecycle
 * phase. Doesn't track riders — it's a clear render of the OrderStatus the
 * system already owns. Tone shifts with `LifecycleLine.tone`.
 */
function OrderStatusLine({
  order,
  venueName,
}: {
  order: Order | undefined;
  venueName: string;
}) {
  if (!order) return null;
  const line: LifecycleLine = lifecycleLabel(order);
  const isTerminal = line.tone === "terminal";
  const isSettled = line.tone === "settled";

  const dotClass = isTerminal
    ? "bg-red-500"
    : isSettled
      ? "bg-brand-muted"
      : "bg-brand-green";
  const labelClass = isTerminal
    ? "text-red-700"
    : "text-brand-ink";

  return (
    <div className="bg-white border-b border-gray-100 px-3.5 py-2 flex items-center gap-2.5">
      <span
        className={
          "w-2 h-2 rounded-full flex-shrink-0 " +
          dotClass +
          (line.tone === "active" ? " animate-pulse" : "")
        }
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className={"text-[12.5px] font-semibold leading-tight " + labelClass}>
          {line.label}
          {!isTerminal && (
            <span className="font-normal text-brand-muted">
              {" · "}
              {venueName}
            </span>
          )}
        </div>
        {line.subLabel && (
          <div className="text-[11px] text-brand-muted leading-tight mt-0.5">
            {line.subLabel}
          </div>
        )}
      </div>
      <span className="text-[11px] text-brand-muted">#{order.shortId}</span>
    </div>
  );
}

/**
 * Opt-in review prompt that sits under a customer's own message during the
 * post-delivery window. Hidden once a review exists on the order (single-shot
 * per order) — even if the saved review came from a different message.
 *
 * The affordance is intentionally inline (not a modal): the spec calls for the
 * lowest-friction promotion path, and a sheet would introduce friction.
 */
function ReviewAffordance({
  message,
  chatPhase,
  order,
  onPromote,
}: {
  message: OrderMessage;
  chatPhase: ChatPhase;
  order: Order;
  onPromote: (rating: 1 | 2 | 3 | 4 | 5) => void;
}) {
  if (chatPhase !== "post-delivery") return null;
  if (!message.text?.trim()) return null;

  const review = order.review;
  // Single-shot — once any message is promoted, hide the affordance on every
  // other message. The promoted message itself swaps to a confirmation pill.
  if (review && review.promotedFromMessageId !== message.id) return null;

  const saved = review?.promotedFromMessageId === message.id ? review : null;

  return (
    <div className="flex justify-end mb-2 -mt-0.5 mr-1">
      <div className="max-w-[85%]">
        {saved ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
            <span className="text-amber-500 tracking-tighter">
              {"★".repeat(saved.rating)}
              <span className="text-emerald-300">
                {"★".repeat(5 - saved.rating)}
              </span>
            </span>
            <span>Saved as review</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-white/80 rounded-full pl-3 pr-2 py-1.5 shadow-sm">
            <span className="text-[11.5px] text-brand-muted">
              Also save as review?
            </span>
            <span className="flex items-center gap-0.5">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => onPromote(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="p-0.5 text-[14px] leading-none text-gray-300 hover:text-amber-500 active:text-amber-600 transition-colors"
                >
                  ★
                </button>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({
  children,
  side,
  time,
  tone = "system",
}: {
  children: React.ReactNode;
  side: "in" | "out";
  time: string;
  tone?: "system" | "vendor";
}) {
  const bg =
    side === "out"
      ? "#DCF8C6"
      : tone === "vendor"
        ? "#FFF8E1"
        : WA_BUBBLE_IN;
  return (
    <div
      className={
        "flex mb-1.5 " + (side === "in" ? "justify-start" : "justify-end")
      }
      style={{ animation: "fadeIn 0.25s ease-out" }}
    >
      <div
        className="max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative"
        style={{ background: bg }}
      >
        {children}
        <div className="text-[10px] text-brand-muted text-right mt-1 -mb-0.5">
          {time}
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
    <div className="flex justify-between gap-3 py-0.5 text-[12px]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function DateChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center mb-3">
      <span className="text-[11px] bg-white/70 px-2.5 py-1 rounded-md text-brand-muted shadow-sm">
        {label}
      </span>
    </div>
  );
}

function formatTime(ts?: number) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
