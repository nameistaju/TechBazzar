import crypto from 'crypto';

/**
 * Mock Payment Processor Interface
 * Structured for plug-and-play integration with Razorpay / Cashfree / Stripe.
 */
export const PaymentService = {
  /**
   * Initialize a payment transaction
   */
  async createPaymentSession({ orderId, amount, currency = 'INR', customerEmail, paymentMethod }) {
    if (paymentMethod === 'cod') {
      return {
        success: true,
        transactionId: `COD-${orderId}-${Date.now()}`,
        status: 'pending_collection',
        method: 'Cash on Delivery'
      };
    }

    // Test Card / UPI simulation
    const mockTransactionId = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    return {
      success: true,
      transactionId: mockTransactionId,
      status: 'authorized',
      method: paymentMethod || 'Card / UPI'
    };
  },

  /**
   * Verify mock signature (analogous to Razorpay webhook / signature verification)
   */
  verifyPayment({ transactionId }) {
    return Boolean(transactionId && transactionId.length > 5);
  }
};

export default PaymentService;
