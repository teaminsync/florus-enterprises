/**
 * Calculate trade price from stockist price (SP)
 * Formula: trade_price_ex_gst = sp * (1 + marginPercent / 100)
 * Default margin is 10%
 */
export function calculateTradePrice(sp: number, marginPercent = 10): number {
  return Math.round(sp * (1 + marginPercent / 100) * 100) / 100;
}

/**
 * Calculate GST amount from GST-exclusive amount
 * Formula: gst_amount = exGstAmount * (gstPercent / 100)
 */
export function calculateGstAmount(exGstAmount: number, gstPercent: number): number {
  return Math.round(exGstAmount * (gstPercent / 100) * 100) / 100;
}

/**
 * Calculate total including GST from GST-exclusive amount
 * Formula: total_incl_gst = exGstAmount * (1 + gstPercent / 100)
 */
export function calculateTotalInclGst(exGstAmount: number, gstPercent: number): number {
  return Math.round(exGstAmount * (1 + gstPercent / 100) * 100) / 100;
}

/**
 * Calculate line item total including GST
 * Used for cart/order line items
 */
export function calculateLineTotal(
  sp: number,
  quantity: number,
  gstPercent: number,
  marginPercent = 10
): {
  unitPriceExGst: number;
  lineSubtotalExGst: number;
  gstAmount: number;
  totalInclGst: number;
} {
  const unitPriceExGst = calculateTradePrice(sp, marginPercent);
  const lineSubtotalExGst = Math.round(unitPriceExGst * quantity * 100) / 100;
  const gstAmount = calculateGstAmount(lineSubtotalExGst, gstPercent);
  const totalInclGst = lineSubtotalExGst + gstAmount;

  return {
    unitPriceExGst,
    lineSubtotalExGst,
    gstAmount,
    totalInclGst,
  };
}
