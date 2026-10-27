# FestiNesia — Prototype v3

An English-language Next.js prototype for discovering Indonesian cultural festivals and destinations. This version follows the shared six-screen reference more closely and keeps the original working KEN 2026 dataset of 125 listings.

## Main screens

- **Home** — full-width cultural travel hero, search controls, dataset statistics, feature cards, popular events, and destination previews.
- **Explore** — event search, category chips, province and date-status filters, budget guidance, KEN Top 10 filter, event cards, saved-event hearts.
- **Event details** — photo gallery preview, overview, 3A (Attraction, Amenities, Accessibility), travel tips/reviews tabs, and source links.
- **AI Planner** — destination/date/budget/interests/travellers form and an assistant preview.
- **Sample itinerary** — three-day visual schedule layout, clearly labeled as illustrative rather than a confirmed plan.
- **Destinations** — destination preview cards and roadmap placeholders for maps and nearby facilities.

## Run locally

Requirements: Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To stop the local server, use `Ctrl + C` in the terminal.

## Prototype vs. implemented functionality

Implemented with local state: app navigation, event search, province/time/category/budget filtering, KEN Top 10 filter, event details, tab selection, saved-event hearts, sample itinerary day tabs, and responsive layouts.

Features not connected yet display a **Coming soon** notice: AI-generated recommendations, AI chat responses, full event galleries, itinerary saving/editing, destination guide details, maps, nearby hotel/restaurant data, traveller profile, and reviews.

## Dataset & content notes

- `data/festivals.json` feeds the UI and includes 125 entries from the user's prepared KEN 2026 dataset.
- `data/FestiNesia_KEN_2026_dataset_diperbarui.csv` is included for reference/editing.
- Date statuses are derived from the dataset; they are not live confirmations.
- Attraction and amenities fields are empty where they have not been verified. The UI displays that limitation instead of inventing facts.
- Photos on cards and detail galleries are **illustrative stock imagery** hosted remotely (mainly Unsplash). They are not presented as official photos of each named event. Event-specific images can be added to the `foto_url` field after confirming source, accuracy, and usage rights.
- Remote images and Google Fonts need an internet connection. If an image provider changes a URL, replace the affected URL in `lib/event-images.ts` or the `imagePool` in `app/page.tsx`.

## Deploy

Push the project to a Git provider such as GitHub and import it into Vercel. Vercel should detect Next.js automatically. Before publishing, verify event dates, source links, image usage rights, and any destination facts that could affect a traveller's plans.
