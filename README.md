# ShareBox

ShareBox combines a community-sharing space with a product marketplace. The
community area supports free giveaways and direct exchanges; marketplace
products are separately catalogued and use server-validated checkout.

## Features

- Search and browse giveaway and exchange listings.
- Browse marketplace products by category, price, newest arrivals, and views.
- Persist a guest cart locally and synchronize it after sign-in.
- Save wishlists, delivery addresses, and order history to authenticated accounts.
- Use server-calculated checkout totals, stock checks, coupon validation, and
  order status tracking.
- Manage marketplace products, categories, coupons, orders, and payment records
  from the role-protected marketplace admin dashboard.
- Keep removed products restorable; permanent deletion requires confirmation
  and preserves product snapshots in existing orders.
- Organize and filter listings by category: Books & Study, Electronics,
  Furniture, Clothing, Home & Kitchen, Sports & Outdoors, Toys & Games, and
  Other.
- Create, edit, and manage listings with multiple images.
- Request items and manage incoming or outgoing requests.
- Coordinate free pickup, self-arranged delivery, or custom handovers through
  request preferences and member-to-member messages. No payment or shipping
  service is required.
- Sign in with email/password or Google.
- Admin tools for managing users and moderating community listings.
- Responsive React interface and Express/MongoDB API.

## Marketplace payment status

Real payment processing is intentionally disabled. Checkout creates a pending
order, and the optional development payment action records an explicitly
simulated result only. It never contacts a payment provider, transfers money,
or represents a real payment. No card numbers, CVVs, UPI PINs, or banking
passwords are collected or stored. A legitimate provider, merchant approval,
server credentials, signature verification, and verified webhooks are required
before enabling any real payment integration.

Marketplace inventory is not seeded with sample products. An administrator
creates categories first and then adds real products from
`/admin/marketplace`. To grant admin access, promote a trusted user through a
secure, out-of-band database administration process; there is no public
role-escalation endpoint.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB connection string
- Google OAuth client ID for Google sign-in

## Local setup

1. Install frontend and backend dependencies:

   ```sh
   npm install
   npm install --prefix backend
   ```

2. Copy `.env.example` to `.env.local` for Vite and
   `backend/.env.example` to `backend/.env`.
3. Set the MongoDB URI, a long random JWT secret, and matching Google OAuth
   client IDs in the environment files. The Google client ID must be configured
   as both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`. Add the frontend
   origin (for example, `http://localhost:5173`) to the OAuth client's
   authorized JavaScript origins.
4. Start the API and frontend in separate terminals:

   ```sh
   npm run dev --prefix backend
   npm run dev
   ```

The frontend API base defaults to `http://localhost:5000/api`; set
`VITE_API_URL` to your backend server URL when deploying (the `/api` path is
added automatically if it is omitted). Set `CLIENT_URL` to the frontend origin
allowed by the API's credentialed CORS configuration.

The original community-sharing experience remains available at `/community`.
The marketplace is the homepage at `/`.

## Checks

```sh
npm run lint
npm run build
```
