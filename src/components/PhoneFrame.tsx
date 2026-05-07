import type { ReactNode } from "react";

export type FrameVariant = "phone" | "tablet";

/**
 * Device-sized frame that adapts to the active perspective.
 * - On desktop, locks to the variant dimensions with rounded corners + shadow.
 * - On phones / tablets actually held in hand, fills the viewport.
 *
 * `dvh` is used everywhere instead of `vh` to avoid the iOS Safari grey-gap
 * bug when the URL bar shows / hides.
 */
export default function PhoneFrame({
  children,
  variant = "phone",
}: {
  children: ReactNode;
  variant?: FrameVariant;
}) {
  const dims =
    variant === "phone"
      ? { maxWidth: 440, maxHeight: 956 }
      : { maxWidth: 1366, maxHeight: 1024 };

  const radiusClass =
    variant === "phone" ? "sm:rounded-[48px]" : "sm:rounded-[36px]";

  return (
    <div className="h-dvh w-full flex items-center justify-center bg-[#f0f0f0] p-0 sm:p-6">
      <div
        className={
          "relative w-full bg-white overflow-hidden flex flex-col sm:shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:border sm:border-black/5 " +
          radiusClass
        }
        style={{
          ...dims,
          height: "100dvh",
        }}
      >
        {children}
      </div>
    </div>
  );
}
