'use client';

import { useEffect } from 'react';
import { acknowledge } from './alert-storage';

/** Opening an order stops its alert (FR-029). */
export function AcknowledgeOrder({ orderId }: { orderId: string }) {
  useEffect(() => acknowledge(orderId), [orderId]);
  return null;
}
