/** Online payments (Principle III: one adapter, stable interface). Cash on delivery does not use it. */
export interface PaymentProvider {
  /** Confirm a UPI payment the customer approved on the confirmation sheet. */
  confirmUpi(input: { orderRef: string; amountRupees: number }): Promise<
    { status: 'succeeded'; reference: string } | { status: 'failed'; reason: 'declined' | 'unavailable' }
  >;
}
