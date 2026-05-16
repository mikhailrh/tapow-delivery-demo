import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNav } from "../context/NavContext";
import { useOrders } from "../context/OrdersContext";
import { useVenue } from "../context/VenueContext";
import {
  countThreadImages,
  getChatPhase,
  MAX_IMAGES_PER_THREAD,
  type ChatPhase,
  type Order,
  type OrderMessage,
} from "../lib/orders";
import { compressImageToDataUrl } from "../lib/imageCompress";
import { BackIcon, PaperclipIcon } from "../components/icons";

/**
 * In-platform chat for an order. The two-way thread, opt-in review, and image
 * attach live here. The single-order TRACKING surface is
 * [OrderTrackingScreen.tsx](src/screens/OrderTrackingScreen.tsx) — full
 * lifecycle status, ETA, rider card, payment, and receipt. This screen is
 * deliberately chat-only; the venue name + #shortId in the header carry
 * enough context, and back() pops to whichever surface opened the chat
 * (tracking row OR WhatsApp preview pill — both work via NavContext stack pop).
 */
export default function OrderChatScreen({ orderId }: { orderId: string }) {
  const { back, go } = useNav();
  const {
    getById,
    sendCustomerMessage,
    promoteMessageToReview,
    markPartyRead,
  } = useOrders();
  const venue = useVenue();
  const stable = getById(orderId);

  if (!stable) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-white">
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

  return (
    <OrderChatBody
      order={stable}
      venueName={venue.name}
      onBack={back}
      onSendText={(text) => sendCustomerMessage(stable.id, { text })}
      onAttachImage={(file) =>
        attachImage(stable, file, (image) =>
          sendCustomerMessage(stable.id, { image }),
        )
      }
      onPromote={(messageId, rating) =>
        promoteMessageToReview(stable.id, messageId, rating)
      }
      onMarkPartyRead={() => markPartyRead(stable.id, "customer")}
    />
  );
}

async function attachImage(
  order: Order,
  file: File,
  emit: (dataUrl: string) => void,
): Promise<string | null> {
  if (countThreadImages(order) >= MAX_IMAGES_PER_THREAD) {
    return `Max ${MAX_IMAGES_PER_THREAD} images per thread. Drop a follow-up in text.`;
  }
  try {
    const { dataUrl } = await compressImageToDataUrl(file);
    emit(dataUrl);
    return null;
  } catch {
    return "Couldn't read that image. Try another one.";
  }
}

function OrderChatBody({
  order,
  venueName,
  onBack,
  onSendText,
  onAttachImage,
  onPromote,
  onMarkPartyRead,
}: {
  order: Order;
  venueName: string;
  onBack: () => void;
  onSendText: (text: string) => void;
  onAttachImage: (file: File) => Promise<string | null>;
  onPromote: (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  onMarkPartyRead: () => void;
}) {
  const messages = order.messages ?? [];
  const chatPhase: ChatPhase = getChatPhase(order);

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

  // While the user is at the bottom, advance lastSeenAt so new bubbles arriving
  // in view are not treated as unread. Banner only fires when scrolled away.
  // Also bumps the cross-party read receipt (Order.lastReadAtCustomer) so the
  // vendor's blue read-tick can flip — broadcasts via the existing Order sync.
  useEffect(() => {
    if (isAtBottom) {
      setLastSeenAt(Date.now());
      onMarkPartyRead();
    }
  }, [isAtBottom, messages.length, onMarkPartyRead]);

  const unreadVendor = useMemo(() => {
    const out: OrderMessage[] = [];
    for (const m of messages) {
      if (m.from === "vendor" && m.at > lastSeenAt) out.push(m);
    }
    return out;
  }, [messages, lastSeenAt]);

  const latestUnread = unreadVendor[unreadVendor.length - 1];
  const showPreview = !isAtBottom && unreadVendor.length > 0;

  const dismissPreview = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setLastSeenAt(Date.now());
  };

  return (
    <div className="relative flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="p-1 -ml-1 text-brand-ink"
        >
          <BackIcon className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-brand-ink leading-tight truncate">
            {venueName}
          </div>
          <div className="text-[11.5px] text-brand-muted leading-tight">
            #{order.shortId}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 pt-3 pb-32 bg-brand-canvas/40"
      >
        {messages.length === 0 ? (
          <EmptyState venueName={venueName} chatPhase={chatPhase} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {messages.map((m) => (
              <CustomerThreadRow
                key={m.id}
                message={m}
                venueName={venueName}
                chatPhase={chatPhase}
                order={order}
                onPromote={(rating) => onPromote(m.id, rating)}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      {showPreview && (
        <PreviewPill
          message={latestUnread!}
          venueName={venueName}
          onClick={dismissPreview}
        />
      )}

      <Composer
        chatPhase={chatPhase}
        venueName={venueName}
        order={order}
        onSendText={onSendText}
        onAttachImage={onAttachImage}
      />
    </div>
  );
}

function EmptyState({
  venueName,
  chatPhase,
}: {
  venueName: string;
  chatPhase: ChatPhase;
}) {
  const copy =
    chatPhase === "closed"
      ? "This conversation is closed."
      : chatPhase === "post-delivery"
        ? `Tap below to leave ${venueName} a note — and share a rating if you'd like.`
        : `Anything for the kitchen? They'll see it right away.`;
  return (
    <div className="text-center py-10 px-4">
      <div className="text-[24px] mb-1 opacity-30">💬</div>
      <div className="text-[13px] text-brand-muted">{copy}</div>
    </div>
  );
}

function CustomerThreadRow({
  message,
  venueName,
  chatPhase,
  order,
  onPromote,
}: {
  message: OrderMessage;
  venueName: string;
  chatPhase: ChatPhase;
  order: Order;
  onPromote: (rating: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const isCustomer = message.from === "customer";
  const align = isCustomer ? "justify-end" : "justify-start";
  const bubbleClass = isCustomer
    ? "bg-brand-ink text-white"
    : "bg-white text-brand-ink border border-gray-100";

  return (
    <>
      <div className={"flex " + align}>
        <div
          className={"max-w-[78%] rounded-2xl px-3 py-2 shadow-sm " + bubbleClass}
          style={{ animation: "fadeIn 0.22s ease-out" }}
        >
          {!isCustomer && (
            <div className="text-[10px] font-bold uppercase tracking-wide text-brand-green mb-0.5">
              {venueName}
            </div>
          )}
          {message.image && (
            <img
              src={message.image}
              alt=""
              className="rounded-lg block max-h-64 w-auto mb-1.5"
            />
          )}
          {message.text && (
            <div className="text-[13.5px] whitespace-pre-line leading-snug">
              {message.text}
            </div>
          )}
          <div
            className={
              "text-[10px] text-right mt-1 -mb-0.5 flex items-center justify-end gap-1 " +
              (isCustomer ? "text-white/60" : "text-brand-muted")
            }
          >
            <span>{formatTime(message.at)}</span>
            {isCustomer && (
              <ReadTick
                isRead={message.at <= (order.lastReadAtVendor ?? 0)}
              />
            )}
          </div>
        </div>
      </div>
      {isCustomer && (
        <ReviewAffordance
          message={message}
          chatPhase={chatPhase}
          order={order}
          onPromote={onPromote}
        />
      )}
    </>
  );
}

/**
 * Single ✓ when sent, double ✓✓ when the vendor has caught up via
 * `markPartyRead("vendor")`. Demo-only single-browser-accurate; production
 * needs the same backend transport as cross-device chat delivery.
 */
function ReadTick({ isRead }: { isRead: boolean }) {
  return (
    <span
      aria-label={isRead ? "Read" : "Sent"}
      className={
        "font-semibold tracking-tighter " +
        (isRead ? "text-sky-300" : "text-white/55")
      }
    >
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}

/**
 * Opt-in review prompt sitting under a customer's own message during the
 * post-delivery window. Hidden once any review exists on the order (single-shot
 * per order). The promoted bubble swaps to a "Saved as review" pill.
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
  if (review && review.promotedFromMessageId !== message.id) return null;

  const saved = review?.promotedFromMessageId === message.id ? review : null;

  return (
    <div className="flex justify-end mb-1 -mt-0.5 mr-1">
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
          <div className="inline-flex items-center gap-2 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-sm border border-gray-100">
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

function PreviewPill({
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
      className="absolute bottom-[68px] left-1/2 -translate-x-1/2 max-w-[88%] bg-white shadow-lg border border-gray-200 rounded-full pl-3 pr-2.5 py-2 flex items-center gap-2 z-30"
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

function Composer({
  chatPhase,
  venueName,
  order,
  onSendText,
  onAttachImage,
}: {
  chatPhase: ChatPhase;
  venueName: string;
  order: Order;
  onSendText: (text: string) => void;
  onAttachImage: (file: File) => Promise<string | null>;
}) {
  const disabled = chatPhase === "closed";
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const albumRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const atImageCap = countThreadImages(order) >= MAX_IMAGES_PER_THREAD;

  const send = () => {
    const t = draft.trim();
    if (!t || disabled) return;
    onSendText(t);
    setDraft("");
  };

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setError(null);
      setBusy(true);
      const result = await onAttachImage(file);
      if (result) setError(result);
      setBusy(false);
    },
    [onAttachImage],
  );

  if (disabled) {
    return (
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100 text-center text-[12px] text-brand-muted">
        Conversation closed.
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 pt-2 pb-3 bg-white border-t border-gray-100">
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
          disabled={busy}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-canvas text-brand-ink hover:bg-gray-200 transition-colors disabled:opacity-50"
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
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={composerPlaceholder(chatPhase, venueName)}
          className="flex-1 bg-brand-canvas rounded-2xl px-3 py-2.5 text-[14px] text-brand-ink placeholder:text-brand-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand-green leading-snug max-h-32"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className={
            "h-10 px-4 rounded-full text-[13.5px] font-bold transition-colors " +
            (draft.trim()
              ? "bg-brand-ink text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed")
          }
        >
          Send
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

function composerPlaceholder(phase: ChatPhase, venueName: string): string {
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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
