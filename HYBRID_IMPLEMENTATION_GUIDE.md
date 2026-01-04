# Hybrid Architecture Implementation Guide

This guide outlines how to complete the hybrid web/mobile architecture for Modoo.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│   Web Version   │         │  Mobile Version  │
│   (Browser)     │         │  (Capacitor)     │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         ├── Next.js API Routes      ├── Supabase Edge Functions
         │   • /api/reviews          │   • reviews-get
         │   • /api/cobuy/*          │   • cobuy-*
         │   • /api/toss/*           │   • toss-*
         │                           │
         └──────────┬────────────────┘
                    │
         ┌──────────▼─────────┐
         │  Supabase Database │
         │  • Products        │
         │  • Orders          │
         │  • Reviews         │
         │  • CoBuy Sessions  │
         └────────────────────┘
```

## Implementation Status

### ✅ Completed

1. **Platform-aware API Client** - [lib/api-client.ts](lib/api-client.ts)
   - Automatically routes to API routes (web) or Edge Functions (mobile)
   - Provides typed helper methods for common operations
   - Handles request/response transformation

2. **Platform Detection** - [lib/platform.ts](lib/platform.ts)
   - Detects iOS, Android, or web
   - Used by API client for routing decisions

3. **Build Infrastructure**
   - Capacitor build script excludes API routes
   - Conditional static export configuration

### 🔄 In Progress

1. **API Route Migration to Edge Functions**
   - Need to create Edge Functions for each API route
   - Update client code to use new API client

## API Routes Inventory

### Priority 1: Critical for Mobile (Migrate First)

1. **`/api/reviews/[productId]`** (GET)
   - Function: `reviews-get`
   - Fetches product reviews
   - Used by: Product pages

2. **`/api/toss/confirm`** (POST)
   - Function: `toss-confirm`
   - Confirms Toss payment
   - Used by: Checkout flow

3. **`/api/cobuy/create-order`** (POST)
   - Function: `cobuy-create-order`
   - Creates CoBuy order
   - Used by: CoBuy feature

### Priority 2: Important Features

4. **`/api/cobuy/payment/confirm`** (POST)
   - Function: `cobuy-payment-confirm`
   - Confirms CoBuy payment
   - Used by: CoBuy checkout

5. **`/api/cobuy/participant/delete`** (POST)
   - Function: `cobuy-participant-delete`
   - Removes participant from session
   - Used by: CoBuy management

### Priority 3: Notifications & Background Tasks

6. **`/api/cobuy/notify/participant-joined`** (POST)
7. **`/api/cobuy/notify/session-closing`** (POST)
8. **`/api/cobuy/notify/session-closed`** (POST)
9. **`/api/checkout/testmode`** (POST)
10. **`/api/convert-image`** (POST)
11. **`/api/orders/[orderId]/files`** (GET)

## Step-by-Step Migration Guide

### Step 1: Create Your First Edge Function

Let's start with the reviews API as an example:

1. **Check existing Supabase Edge Functions:**
   ```bash
   # List existing functions
   npm run supabase functions list
   ```

2. **Create the Edge Function:**
   ```bash
   # This will be done using the Supabase MCP
   # Example structure for reviews-get function
   ```

3. **Edge Function Template:**
   ```typescript
   // supabase/functions/reviews-get/index.ts
   import { createClient } from '@supabase/supabase-js'

   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_ANON_KEY') ?? ''
     )

     // Get productId from request body or URL params
     const { productId } = await req.json()

     // Fetch reviews from database
     const { data, error } = await supabase
       .from('reviews')
       .select('*')
       .eq('product_id', productId)
       .order('created_at', { ascending: false })

     if (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 400,
         headers: { 'Content-Type': 'application/json' }
       })
     }

     return new Response(JSON.stringify(data), {
       headers: { 'Content-Type': 'application/json' }
     })
   })
   ```

### Step 2: Update Client Code

Replace direct API calls with the new API client:

**Before:**
```typescript
// Old approach
const response = await fetch(`/api/reviews/${productId}`)
const reviews = await response.json()
```

**After:**
```typescript
// New approach - works on web and mobile!
import { api } from '@/lib/api-client'

const reviews = await api.reviews.get(productId)
```

### Step 3: Test on Both Platforms

1. **Test on Web:**
   ```bash
   npm run dev
   # Should use local API routes
   ```

2. **Test on Mobile:**
   ```bash
   npm run cap:sync
   npm run cap:ios  # or cap:android
   # Should use Edge Functions
   ```

## Using the API Client

### Basic Usage

```typescript
import { apiRequest, api } from '@/lib/api-client'

// Generic request
const data = await apiRequest('/reviews/123')

// Using helper methods
const reviews = await api.reviews.get('product-id')
const order = await api.cobuy.createOrder({ /* data */ })
const payment = await api.payments.confirmToss({ /* data */ })
```

### Adding New Endpoints

1. **Create Edge Function** (for mobile)
2. **Keep API route** (for web)
3. **Add helper method** to api-client.ts:

```typescript
export const api = {
  // ... existing methods

  myFeature: {
    async doSomething(data: any) {
      return apiRequest('/my-feature/action', {
        method: 'POST',
        body: data,
      });
    },
  },
};
```

## Migration Checklist

### For Each API Route:

- [ ] Review existing API route code
- [ ] Extract business logic (separate from Next.js-specific code)
- [ ] Create equivalent Edge Function
- [ ] Deploy Edge Function to Supabase
- [ ] Test Edge Function directly
- [ ] Update client code to use `api-client.ts`
- [ ] Test on web (should use API route)
- [ ] Test on mobile (should use Edge Function)
- [ ] Update error handling if needed
- [ ] Document any differences or limitations

## Current API Client Features

✅ Platform detection (auto-routes to correct backend)
✅ Typed helper methods for common operations
✅ Error handling with meaningful messages
✅ Support for all HTTP methods
✅ Custom headers support
✅ Request/response JSON transformation

## Next Steps

1. **Create Priority 1 Edge Functions:**
   - reviews-get
   - toss-confirm
   - cobuy-create-order

2. **Update Client Code:**
   - Find all `fetch('/api/...)` calls
   - Replace with `api.*` or `apiRequest()`
   - Test thoroughly

3. **Deploy and Test:**
   - Deploy Edge Functions to Supabase
   - Build Capacitor app
   - Test all features on mobile

4. **Migrate Remaining Routes:**
   - Work through Priority 2 & 3
   - Document any issues
   - Update this guide with learnings

## Troubleshooting

### Issue: "Edge Function not found"
- Verify function is deployed: Check Supabase dashboard
- Check function naming: Should match `endpointToFunctionName()` output
- Verify Supabase credentials in mobile app

### Issue: "Works on web but not mobile"
- Check platform detection: Log `isNative()` result
- Verify Edge Function is deployed
- Check Supabase configuration in app
- Review Edge Function logs in Supabase dashboard

### Issue: "Different behavior web vs mobile"
- Compare API route vs Edge Function code
- Check environment variables
- Verify database permissions (RLS policies)
- Review request/response formats

## Resources

- API Client: [lib/api-client.ts](lib/api-client.ts)
- Platform Utils: [lib/platform.ts](lib/platform.ts)
- Supabase Dashboard: [Your Supabase Project]
- Edge Functions Docs: https://supabase.com/docs/guides/functions

---

**Need Help?** Check the Supabase Edge Functions documentation or review existing Edge Functions for examples.
