export const formatRM = (n: number) =>
  `RM${n.toFixed(2)}`;

/** Malaysian F&B service charge (restaurant-set, not a tax). */
export const SERVICE_CHARGE_RATE = 0.1;
/** Sales & Service Tax — 6% for F&B in Malaysia. */
export const SST_RATE = 0.06;
export const DELIVERY_FEE = 5.0;
