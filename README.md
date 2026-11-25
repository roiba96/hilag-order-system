# HILAG: Order System for a Home Bakery

A mobile-first web app (Hebrew, right-to-left) that takes a small home bakery's holiday orders from
WhatsApp chats to one clear list: what to fry, what to pack, who is coming, and who still has to pay.

> This is a clean public copy made for my portfolio. It contains no real customers, orders, keys or
> contact details. Names, phone numbers and addresses in the tests are made-up test data, and the
> pickup town was replaced with a demo name.

## The problem

A home bakery sells filled donuts for Hanukkah. Orders arrive in WhatsApp chats and were managed
there and from memory. That makes a few things hard during a busy week:

- knowing how many boxes are already booked for each day
- knowing exactly how many donuts of each flavor to fry, and for which batch
- keeping track of who was asked to pay and who actually paid
- working from a phone, in the kitchen, in a hurry

## What the system does

One user (the baker) logs in, mostly from an iPhone. The app can be added to the home screen.

- **New order:** customer, day, pickup or delivery, and boxes of 4 or 6 in any mix of flavors. The
  form checks the details and calculates the total.
- **Orders:** a searchable list, with editing, cancelling and undoing a cancel.
- **Payments:** who hasn't paid, a guided queue for sending reminders one by one, and "mark as paid"
  with undo.
- **Frying list:** how many of each flavor to fry per day, split into the delivery batch and the
  pickup batch.
- **Today:** boxes booked and left, what to pack, deliveries, pickups, a text list to copy for the
  courier, day-before reminders, and a page to print for the fridge.
- **Settings:** open or close a day, allow pickup or delivery per day, set the maximum number of
  boxes, change prices, and export all orders to CSV.

Messages (order summary with payment request, payment reminder, day-before reminder) open in WhatsApp
with the text ready. The baker still taps "send".

## Key decisions and why

| Decision | Why |
|---|---|
| Saving an order never sends a message. WhatsApp opens with the text ready | The baker sees every message before it goes out |
| WhatsApp buttons are normal links, built on the server | More reliable than opening WhatsApp from code |
| Going over a day's capacity, or using a closed day, asks for confirmation instead of blocking | The baker decides on exceptions; the app only warns |
| A box must be exactly full before saving | A half-filled box would make the frying list wrong. It is checked in the form, on the server and in the database |
| Each order keeps the prices and the customer name it was saved with | Changing a price or a name later must not change old orders |
| Saving an order is one database function | Customer, order and boxes are saved together, or not at all |
| Totals are calculated on the server | The browser's numbers are never trusted |
| Only logged-in users can read data (row level security), and the admin key is never used | The data includes names, phones and addresses |
| Customer details are never written to logs | Privacy |
| Phones are stored in one format | One record per customer, and WhatsApp links work |
| "Today" is always Israel time | The server may run in another time zone |
| Business settings sit in one file (`src/lib/config.ts`) | So the app can grow beyond one holiday |

## My role

I defined the problem, made the decisions, tested and deployed; Claude Code wrote the code.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Database and login:** Supabase (Postgres and Auth)
- **Input checks:** zod
- **Tests:** Vitest, plus PGlite (an in-memory Postgres) to test the real SQL
- **Hosting:** set up for Netlify

## Current status and results

- **Built:** everything listed under "What the system does".
- **Not built yet:** filling in an order by pasting a WhatsApp message (AI parsing; the code only has
  a placeholder that says it isn't ready), and a season dashboard.
- **Tests:** 240 automated tests pass, along with lint and a production build. They include running
  all the SQL files in order on an in-memory database.
- **Business results:** none published here. The first season is Hanukkah 2026 (December).

## Run it yourself

You need Node 20.9 or newer. For real data you also need a Supabase project.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. In the Supabase SQL Editor, run `schema.sql`, then the files in `supabase/migrations/` in number
   order.
4. In Supabase Auth, **turn off public sign-up** and add your user by hand. Every logged-in user can
   see all the data, so this step matters.
5. `npm run dev`, then open http://localhost:3000

| Command | What it does |
|---|---|
| `npm test` | Runs all tests (no network or database needed) |
| `npm run lint` | Checks the code for common mistakes |
| `npm run build` | Builds for production |
| `npm run icons` | Recreates the app icons |

## Folder structure

```
src/app/              The screens. Each folder is a page:
  login/                log in
  orders/               order list, new order, edit order
  payments/             payment tracking and reminder queue
  fry/                  frying list
  today/                the day's work, reminders, print page
  settings/             days, prices, CSV export
  api/                  small server endpoints
src/components/       Shared pieces of the screens (buttons, badges, dialogs)
src/lib/              The business rules: prices, phones, dates, messages, checks.
                      Files ending in .test.ts are their tests
src/middleware.ts     Sends anyone who isn't logged in to the login page
schema.sql            The base database: tables, rules, starting menu and days
supabase/migrations/  Later database changes, in order
tests/                Tests for the database and the WhatsApp links
public/icons/         App icons
scripts/              Creates the icons
CLAUDE.md             The working rules I gave Claude Code for this project
```
