

# Binance Payment Verification SaaS Platform

## Overview
A subscription-based platform where users purchase access to a Binance payment verification service. Users configure their Binance credentials, get an API endpoint, and integrate it into their websites. The payment verification logic runs as Supabase Edge Functions — no Vercel needed.

## Pages & Features

### 1. Landing Page
- Hero section explaining the service: "Verify Binance Pay & BEP20 payments instantly"
- Pricing cards for Weekly, Monthly, and Yearly plans (placeholder prices, admin can update later)
- Features list, FAQ section, and CTA to sign up

### 2. Authentication (Supabase Auth)
- Sign up / Login pages with email & password
- Password reset flow
- User profiles table with basic info

### 3. User Dashboard
- **Subscription Status**: Current plan, expiry date, renewal options
- **Purchase Subscription**: Choose weekly/monthly/yearly plan, pay via crypto (manual transaction ID verification using the same Binance logic)
- **API Configuration Panel**:
  - Binance API Key & Secret input
  - Binance Pay ID
  - BEP20 wallet address
  - Optional image upload (logo/branding)
- **Your API Endpoint**: Generated unique endpoint URL users copy-paste into their website
- **API Key Management**: View/regenerate their API key for authenticating requests
- **Usage Stats**: Recent verification logs, success/failure counts

### 4. Admin Dashboard
- **User Management**: List all users, search, filter by status/plan
- **User Actions**: Add user, remove user, extend expiry, reduce expiry, change plan
- **Subscription Overview**: Active/expired/total users, revenue tracking
- **System Settings**: Update pricing, verification time window, manage plans
- **Verification Logs**: View all payment verification attempts across users

### 5. API Endpoint (Supabase Edge Functions)
- **`/verify-payment`**: Accepts transaction_id, payment_type (bep20/binance_pay), expected_amount — uses the user's stored Binance credentials to verify
- **`/health`**: Health check
- **`/test-connection`**: Test Binance API connectivity
- **`/clear-used-transactions`**: Clear used transaction records
- Subscription validation: reject requests from expired users
- Rate limiting per user plan

## Database Tables (Supabase)
- `profiles` — user info
- `user_roles` — admin/user roles (security definer pattern)
- `subscriptions` — plan type, start/end dates, status
- `api_configurations` — Binance keys, Pay ID, BEP20 address, image per user
- `api_keys` — generated API keys for endpoint authentication
- `used_transactions` — prevent duplicate transaction verification
- `payment_verification_logs` — audit trail
- `pricing_plans` — configurable plan prices
- `system_settings` — time window, global configs

## Design
- Dark theme, modern SaaS look
- Clean dashboard with sidebar navigation
- Cards and tables for data display
- Toast notifications for actions

