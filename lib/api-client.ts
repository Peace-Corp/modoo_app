/**
 * Platform-aware API Client
 *
 * Routes API calls to either:
 * - Local Next.js API routes (web)
 * - Supabase Edge Functions (native mobile)
 */

import { isNative } from './platform';
import { createClient } from './supabase-client';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Make an API request that works on both web and native platforms
 *
 * @param endpoint - API endpoint path (e.g., '/reviews/123')
 * @param options - Request options
 * @returns Response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  if (isNative()) {
    // On native: Use Supabase Edge Functions
    return await callEdgeFunction<T>(endpoint, { method, body, headers });
  } else {
    // On web: Use local Next.js API routes
    return await callLocalApi<T>(endpoint, { method, body, headers });
  }
}

/**
 * Call local Next.js API route (web only)
 */
async function callLocalApi<T>(
  endpoint: string,
  options: ApiRequestOptions
): Promise<T> {
  const { method, body, headers } = options;

  // Ensure endpoint starts with /api
  const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  const response = await fetch(apiPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Call Supabase Edge Function (native mobile)
 */
async function callEdgeFunction<T>(
  endpoint: string,
  options: ApiRequestOptions
): Promise<T> {
  const { method, body, headers } = options;
  const supabase = createClient();

  // Convert API endpoint to Edge Function name
  // e.g., /api/reviews/123 -> reviews-get
  // e.g., /api/cobuy/create-order -> cobuy-create-order
  const functionName = endpointToFunctionName(endpoint, method);

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers,
    });

    if (error) {
      throw new Error(error.message || 'Edge Function request failed');
    }

    return data as T;
  } catch (error) {
    console.error(`Edge Function error (${functionName}):`, error);
    throw error;
  }
}

/**
 * Convert API endpoint path to Edge Function name
 *
 * Examples:
 * - /api/reviews/[id] GET -> reviews-get
 * - /api/cobuy/create-order POST -> cobuy-create-order
 * - /api/toss/confirm POST -> toss-confirm
 */
function endpointToFunctionName(endpoint: string, method: string = 'GET'): string {
  // Remove /api prefix if present
  let path = endpoint.replace(/^\/api\/?/, '');

  // Remove dynamic segments (convert /reviews/123 to /reviews)
  path = path.replace(/\/[0-9a-f-]+(?=\/|$)/gi, '');

  // Remove trailing slashes
  path = path.replace(/\/$/, '');

  // Convert to lowercase and replace slashes with hyphens
  const baseName = path.toLowerCase().replace(/\//g, '-') || 'index';

  // Add method suffix for POST/PUT/DELETE (GET is default)
  if (method !== 'GET') {
    return `${baseName}-${method.toLowerCase()}`;
  }

  return baseName;
}

/**
 * Specific API helpers for common operations
 */

export const api = {
  // Reviews
  reviews: {
    async get(productId: string) {
      return apiRequest(`/reviews/${productId}`);
    },
  },

  // CoBuy
  cobuy: {
    async createOrder(data: any) {
      return apiRequest('/cobuy/create-order', {
        method: 'POST',
        body: data,
      });
    },

    async deleteParticipant(data: any) {
      return apiRequest('/cobuy/participant/delete', {
        method: 'POST',
        body: data,
      });
    },

    async confirmPayment(data: any) {
      return apiRequest('/cobuy/payment/confirm', {
        method: 'POST',
        body: data,
      });
    },

    async notifyParticipantJoined(data: any) {
      return apiRequest('/cobuy/notify/participant-joined', {
        method: 'POST',
        body: data,
      });
    },

    async notifySessionClosing(data: any) {
      return apiRequest('/cobuy/notify/session-closing', {
        method: 'POST',
        body: data,
      });
    },

    async notifySessionClosed(data: any) {
      return apiRequest('/cobuy/notify/session-closed', {
        method: 'POST',
        body: data,
      });
    },
  },

  // Payments
  payments: {
    async confirmToss(data: any) {
      return apiRequest('/toss/confirm', {
        method: 'POST',
        body: data,
      });
    },

    async testMode(data: any) {
      return apiRequest('/checkout/testmode', {
        method: 'POST',
        body: data,
      });
    },
  },

  // Files
  files: {
    async getOrderFiles(orderId: string) {
      return apiRequest(`/orders/${orderId}/files`);
    },

    async convertImage(data: any) {
      return apiRequest('/convert-image', {
        method: 'POST',
        body: data,
      });
    },
  },
};
