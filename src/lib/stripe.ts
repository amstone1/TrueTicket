import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Platform fee percentage (10%)
export const PLATFORM_FEE_PERCENT = 10;

// Calculate fees
export function calculateFees(subtotal: number): { fees: number; total: number } {
  const fees = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const total = Math.round((subtotal + fees) * 100) / 100;
  return { fees, total };
}

// Format amount for Stripe (convert dollars to cents)
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

// Format amount from Stripe (convert cents to dollars)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}

// Create line items for Stripe checkout
export interface CheckoutItem {
  eventName: string;
  tierName: string;
  priceUsd: number;
  quantity: number;
}

export function createLineItems(items: CheckoutItem[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${item.eventName} - ${item.tierName}`,
        description: `Ticket for ${item.eventName}`,
      },
      unit_amount: formatAmountForStripe(item.priceUsd),
    },
    quantity: item.quantity,
  }));
}

// Add service fee line item
export function createFeeLineItem(feeAmount: number): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Service Fee',
        description: 'Platform service and processing fee',
      },
      unit_amount: formatAmountForStripe(feeAmount),
    },
    quantity: 1,
  };
}
