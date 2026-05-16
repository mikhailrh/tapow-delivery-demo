import { useEffect, useRef, useState } from "react";
import { useOrders } from "../../context/OrdersContext";
import {
  CloseIcon,
  PaperclipIcon,
} from "../../components/icons";
import {
  countThreadImages,
  getChatPhase,
  lifecycleLabel,
  MAX_IMAGES_PER_THREAD,
  type ChatPhase,
  type LifecycleLine,
  type Order,
  type OrderMessage,
} from "../../lib/orders";
import { compressImageToDataUrl } from "../../lib/imageCompress";
import { markChatRead } from "../../lib/vendorReadState";

const QUICK_REPLIES = [
  "Hey, we're out — would a similar item work as a sub?",
  "Heads up, we're running ~5 min behind on yours.",
  "Driver's at your door — let us know if anything changes.",
  "Can you confirm the apartment unit number?",
];

/**
 * Full two-way thread for the kitchen — opened from the order card kebab or
 * from the order-detail "Send message" button. Mirrors the customer-side
 * WhatsAppScreen ChatInput / phase semantics so both ends agree on when the
 * thread is operational vs. feedback vs. closed.
 *
 * Marks the order's chat as read on mount and whenever new messages arrive
 * while the sheet is open, via `markChatRead` — that record stays per-tab
 * (see [src/lib/vendorReadState.ts](src/lib/vendorReadState.ts)).
 */
export default function VendorChatSheet({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { getById, sendVendorMessage, markPartyRead } = useOrders();
  const order = getById(orderId);

  // Auto-mark-read on every render where the message count changes. Both
  // signals fire together but mean different things:
  //   - markChatRead   → per-tab vendorLastReadAt → clears the kebab badge
  //                      + banner roll-up on THIS tab only (not broadcast).
  //   - markPartyRead  → cross-party Order.lastReadAtVendor → broadcasts so
  //                      the customer's blue read-tick can flip in real time.
  useEffect(() => {
    if (!order) return;
    markChatRead(order.id);
    markPartyRead(order.id, "vendor");
  }, [order?.id, order?.messages?.length, markPartyRead]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative bg-white rounded-t-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col max-h-[88vh]"
        style={{ animation: "sheetUp 0.22s ease-out" }}
      >
        <Header order={order} onClose={onClose} />
        <ChatBody order={order} />
        <ChatComposer
          order={order}
          onSend={(payload) => sendVendorMessage(order.id, payload)}
        />
      </div>
    </div>
  );
}

function Header({ order, onClose }: { order: Order; onClose: () => void }) {
  const line: LifecycleLine = lifecycleLabel(order);
  const isTerminal = line.tone === "terminal";
  const isSettled = line.tone === "settled";

  const dotClass = isTerminal
    ? "bg-red-500"
    : isSettled
      ? "bg-brand-muted"
      : "bg-brand-green";

  return (
    <div className="border-b border-gray-100 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-brand-ink leading-tight">
            #{order.shortId} · {order.customerName}
          </div>
          <div className="text-[11.5px] text-brand-muted capitalize">
            {order.fulfillment} · {order.status}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1 -mr-1 -mt-1">
          <CloseIcon className="w-6 h-6 text-brand-ink" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={
            "w-2 h-2 rounded-full flex-shrink-0 " +
            dotClass +
            (line.tone === "active" ? " animate-pulse" : "")
          }
          aria-hidden
        />
        <span
          className={
            "text-[12.5px] font-semibold leading-tight " +
            (isTerminal ? "text-red-700" : "text-brand-ink")
          }
        >
          {line.label}
          {line.subLabel && (
            <span className="font-normal text-brand-muted">
              {" · "}
              {line.subLabel}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function ChatBody({ order }: { order: Order }) {
  const messages = order.messages ?? [];
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Vendor's outgoing message is "read" once the customer's `lastReadAtCustomer`
  // has caught up to its timestamp. Reads from the Order's cross-party field.
  const customerReadAt = order.lastReadAtCustomer ?? 0;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-3 bg-brand-canvas/40"
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-1.5">
          {messages.map((m) => (
            <VendorBubble
              key={m.id}
              message={m}
              isRead={m.at <= customerReadAt}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-[24px] mb-1 opacity-30">💬</div>
      <div className="text-[13px] text-brand-muted">
        No messages yet. Tap a quick reply or type one below.
      </div>
    </div>
  );
}

function VendorBubble({
  message,
  isRead,
}: {
  message: OrderMessage;
  isRead: boolean;
}) {
  const isVendor = message.from === "vendor";
  const align = isVendor ? "justify-end" : "justify-start";
  const bubbleClass = isVendor
    ? "bg-brand-ink text-white"
    : "bg-white text-brand-ink border border-gray-100";

  return (
    <div className={"flex " + align}>
      <div
        className={"max-w-[78%] rounded-2xl px-3 py-2 shadow-sm " + bubbleClass}
        style={{ animation: "fadeIn 0.22s ease-out" }}
      >
        {!isVendor && (
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-muted mb-0.5">
            Customer
          </div>
        )}
        {message.image && (
          <img
            src={message.image}
            alt=""
            className="rounded-lg mb-1.5 block max-h-64 w-auto"
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
            (isVendor ? "text-white/60" : "text-brand-muted")
          }
        >
          <span>{formatTime(message.at)}</span>
          {isVendor && <ReadTick isRead={isRead} onDark />}
        </div>
      </div>
    </div>
  );
}

/**
 * Single ✓ when sent, double ✓✓ when the other party has caught up to this
 * message via `markPartyRead`. Demo-only single-browser-accurate; production
 * needs the same backend transport as cross-device chat delivery.
 */
function ReadTick({
  isRead,
  onDark,
}: {
  isRead: boolean;
  onDark: boolean;
}) {
  const colorClass = isRead
    ? onDark
      ? "text-sky-300"
      : "text-sky-500"
    : onDark
      ? "text-white/55"
      : "text-brand-muted";
  return (
    <span
      aria-label={isRead ? "Read" : "Sent"}
      className={"font-semibold tracking-tighter " + colorClass}
    >
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}

function ChatComposer({
  order,
  onSend,
}: {
  order: Order;
  onSend: (payload: { text?: string; image?: string }) => void;
}) {
  const phase: ChatPhase = getChatPhase(order);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const albumRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const disabled = phase === "closed";
  const placeholder = composerPlaceholder(phase);

  const send = () => {
    const t = draft.trim();
    if (!t || disabled) return;
    onSend({ text: t });
    setDraft("");
  };

  const onImageFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    if (countThreadImages(order) >= MAX_IMAGES_PER_THREAD) {
      setError(
        `Max ${MAX_IMAGES_PER_THREAD} images per thread. Drop a follow-up in text.`,
      );
      return;
    }
    setImageBusy(true);
    try {
      const { dataUrl } = await compressImageToDataUrl(file);
      onSend({ image: dataUrl });
    } catch {
      setError("Couldn't read that image. Try another one.");
    } finally {
      setImageBusy(false);
    }
  };

  if (disabled) {
    return (
      <div className="border-t border-gray-100 px-5 py-3 text-center text-[12px] text-brand-muted">
        Conversation closed.
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 px-3 pt-2 pb-3 bg-white">
      <QuickReplies onPick={(t) => setDraft(t)} />
      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 mb-2">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2 relative">
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onImageFile(e.target.files?.[0]);
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
            onImageFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Attach image"
          disabled={imageBusy}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-canvas text-brand-ink hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <PaperclipIcon className="w-4 h-4" />
        </button>
        {pickerOpen && (
          <AttachmentPicker
            disabled={imageBusy}
            atCap={countThreadImages(order) >= MAX_IMAGES_PER_THREAD}
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
          placeholder={placeholder}
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

function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
      {QUICK_REPLIES.map((q, i) => (
        <button
          key={i}
          onClick={() => onPick(q)}
          className="flex-shrink-0 bg-brand-canvas hover:bg-gray-200 transition-colors rounded-full px-3 py-1.5 text-[12px] text-brand-ink leading-snug"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function AttachmentPicker({
  disabled,
  atCap,
  onCamera,
  onAlbum,
  onClose,
}: {
  disabled: boolean;
  atCap: boolean;
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

function composerPlaceholder(phase: ChatPhase): string {
  switch (phase) {
    case "pre-pickup":
      return "Message the customer";
    case "in-transit":
      return "Message about this delivery";
    case "post-delivery":
      return "Send a follow-up";
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
