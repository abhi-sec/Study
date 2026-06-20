# Study Tracker (Next.js + MongoDB Atlas)

Production-ready study tracker built with Next.js App Router, MongoDB Atlas, and Mongoose.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`.
3. Run development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for signing session JWT cookies
- `CRON_SECRET` - Optional bearer token for `/api/cron/evaluate-streaks`

## Scripts

- `npm run dev` - Next.js development server
- `npm run build` - Production build
- `npm start` - Start production server
- `npm test` - Node test runner
