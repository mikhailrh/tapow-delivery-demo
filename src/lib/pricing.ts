export function calculateSavings(subtotal: number, tapowDelivery: number, tapowService: number): number {
  const vendorMarkupOnGrab = 0.20;
  const grabDeliveryFee = 8.99;
  const grabServiceRate = 0.10;

  const grabSubtotal = subtotal * (1 + vendorMarkupOnGrab);
  const grabService = grabSubtotal * grabServiceRate;
  const grabTotal = grabSubtotal + grabService + grabDeliveryFee;

  const tapowTotal = subtotal + tapowDelivery + tapowService;
  const savings = grabTotal - tapowTotal;

  return Math.max(0, Math.round(savings * 100) / 100);
}
