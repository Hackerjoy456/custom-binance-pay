# Custom Binance Pay Gateway

A powerful, self-hosted cryptocurrency payment gateway built with React, Vite, and Supabase. Allows merchants to accept USDT/BUSD via Binance Pay and BEP20 (Binance Smart Chain) directly on their own websites without requiring complex coding or ongoing platform fees.

## Core Features
*   **Seamless Checkout:** Beautiful, high-converting payment widget in dark mode.
*   **Dual Payment Methods:** Accepts both Binance Pay (QR Code) and direct BEP20 wallet transfers.
*   **Zero Middlemen:** Payments go directly to your Binance account or BEP20 wallet.
*   **Auto-Verification:** Secure, automatic payment background verification against the Binance API and BSCscan.
*   **Payment Links Generator:** Let merchants create simple shareable URLs (`/pay/12345?amount=50`) to act as instant invoices.
*   **Webhooks & Redirects:** Capable of returning verified payload data directly to the merchant's success page (`?order_id=xyz&amount=10&tx_id=0x...`).

## Technology Stack
*   **Frontend:** React 18, Vite, TypeScript
*   **UI Framework:** Tailwind CSS, shadcn/ui, Lucide React
*   **Backend / Database:** [Supabase](https://supabase.com) (PostgreSQL, Edge Functions, Auth, Storage)
*   **Routing:** React Router DOM

## Running the Project Locally

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Hackerjoy456/custom-binance-pay.git
   cd custom-binance-pay
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://<your-project-url>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```

4. **Start the development server:**
   ```sh
   npm run dev
   ```

## Deploying to Supabase (Self-Hosting)
This project relies on Supabase for the database, user authentication, and edge functions (verifying the Binance payments).

1. Install the Supabase CLI: `npx supabase login`
2. Link the local project to your new Supabase project: `npx supabase link --project-ref <your-project-id>`
3. Deploy the Edge functions to your server: `npx supabase functions deploy`
4. Set required secrets for the Edge Functions in your Supabase dashboard:
   * `BINANCE_PROXY_URL`
   * `PROXY_SECRET`

## Editing the Code
You can edit the code in any IDE (like VS Code). Changes to the `src/` directory will Auto-Reload in your browser if `npm run dev` is running.
