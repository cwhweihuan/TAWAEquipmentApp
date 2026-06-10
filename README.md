# WeihuanTAWAApp

A web app for archiving company equipment and configuring store buildouts. It replaces a
sprawling master spreadsheet with a searchable catalog of equipment "cards" (each with specs
and a spec-sheet PDF) and a drag-and-drop builder for assembling the equipment list of a new
store.

## What it does

- **Equipment catalog** — 209 equipment items as cards, with instant keyword search,
  filtering across 9 departments (Meat, Seafood, Produce, Grocery, Bakery, Hot Deli,
  Warehouse, General Market, Subtenants), and a detail drawer with full technical specs
  (electrical / plumbing / gas) and an embedded PDF viewer.
- **Manage equipment** — create, edit, and delete equipment cards; upload a spec PDF and bind
  it to a card.
- **Store builder** — for each store, drag equipment from the catalog into the store's
  schedule (or click to add), set quantity / room / "propose-new", reorder by drag, and add
  custom one-off items.
- **Exports** — download a store's schedule as a styled Excel file, or download a ZIP bundle
  of all of that store's spec PDFs.

## Stack

| Layer     | Tech                                       |
| --------- | ------------------------------------------ |
| Framework | Next.js 16 (App Router) + TypeScript       |
| UI        | Tailwind CSS v4, lucide-react, dnd-kit     |
| Data      | Supabase Postgres via Prisma               |
| Files     | Supabase Storage (spec PDFs)               |
| Export    | exceljs (Excel) + jszip (PDF bundle)       |
| Hosting   | Vercel                                      |

## Local development

```bash
npm install
cp .env.example .env      # fill in your Supabase credentials
npx prisma migrate dev    # create tables
npm run db:seed           # load 209 items, 3 sample stores, upload PDFs to Storage
npm run dev               # http://localhost:3000
```

## Data pipeline

The original data lived in a Google Sheet (master list + per-store tabs) with spec PDFs
hyperlinked from Google Drive. `data/extract.py` parses the exported workbook into
`data/seed/*.json`; the spec PDFs are downloaded from Drive and re-hosted in Supabase Storage
by the seed script.

## Deployment (Vercel)

Set the same environment variables from `.env.example` in the Vercel project. The build runs
`prisma generate && prisma migrate deploy && next build`, so schema changes apply on deploy.
