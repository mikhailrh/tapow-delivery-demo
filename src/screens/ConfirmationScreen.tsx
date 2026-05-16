import { useEffect } from "react";
import { useNav } from "../context/NavContext";
import { CheckIcon } from "../components/icons";

export default function ConfirmationScreen({
  orderId,
}: {
  orderId?: string;
}) {
  const { go } = useNav();

  useEffect(() => {
    if (!orderId) return;
    const t = setTimeout(
      () => go({ name: "orderTracking", orderId }),
      1800,
    );
    return () => clearTimeout(t);
  }, [go, orderId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-8">
      <div
        className="w-20 h-20 rounded-full bg-brand-green flex items-center justify-center mb-6"
        style={{ animation: "popIn 0.35s ease-out" }}
      >
        <CheckIcon
          className="w-10 h-10 text-white"
          strokeWidth={3}
        />
      </div>
      <h1 className="text-[24px] font-bold text-brand-ink">Order placed!</h1>
      <p className="text-brand-muted mt-2 text-center text-[14px]">
        Tracking your order…
      </p>

      <div className="mt-10 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-green"
            style={{
              animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`,
              opacity: 0.35,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
