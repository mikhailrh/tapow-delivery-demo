export const formatRM = (n: number) =>
  `RM${n.toFixed(2)}`;

/**
 * Tapow customer-facing platform fee. The other ~10% you may see in pitch
 * decks is Tapow's COMMISSION on the vendor — vendor-side accounting only,
 * never surfaced to the customer and not modeled in this demo.
 */
export const PLATFORM_FEE_RATE = 0.01;
/** Sales & Service Tax — 6% for F&B in Malaysia. */
export const SST_RATE = 0.06;
export const DELIVERY_FEE = 5.0;
