# FestiNesia — Current Prototype

An English-language Next.js prototype for discovering upcoming Indonesian cultural festivals and planning culture-focused trips. The current active catalogue contains 11 festival listings with dates after 26 November 2026. Dates and visitor details are based on the working dataset and are not live confirmations.

## Main sections

- **Home** — cultural travel introduction, festival search, current catalogue statistics, featured events, and destination previews.
- **Explore** — search and filter active festival listings by province, date status, category, and ticket-price guidance.
- **Festival details** — a shared event-detail template with an event overview, Attraction, Amenities, Accessibility, travel tips, review placeholder, source links, and an image-gallery preview. Content changes according to the selected festival record.
- **Trip Planner** — users select a destination, travel dates (up to 7 days), budget preference, interests, and traveller count. The app matches festival listings by destination and date, then ranks matches using selected interests.
- **Itinerary** — automatically creates a day-by-day outline. Dataset-backed festivals are placed on matching dates; flexible activity ideas fill open parts of the day. Users can add, remove, and reorder activities, then save the plan in the current browser.
- **Destinations** — destination preview cards and roadmap placeholders for detailed destination guides, maps, and nearby facilities.

## Run locally

Requirements: Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Stop the development server with `Ctrl + C`.

To verify a production build:

```bash
npm run build
```

## Current functionality and limitations

- Event search, category filters, province filters, upcoming/ongoing status filters, price guidance, event-detail tabs, and saved-event hearts are implemented with local data/state.
- Event detail pages use the same layout, but the Overview and 3A content is read from each event's own dataset fields. Unknown or unverified details are described as such rather than filled with assumptions.
- The Trip Planner matches festival records by destination and date, then ranks results by selected interests. The budget is currently stored as a planning preference; it does not calculate total transport, accommodation, or meal costs.
- The itinerary generator places matching festival listings on dates that overlap the trip. It adds clearly labelled flexible ideas for open parts of each day; these are not confirmed venues, reservations, or route recommendations. No unsupported venue name or visit time is invented.
- Itinerary editing and saving are browser-local. Saved plans are available in the same browser on the same device; there is no user account or cloud sync.
- No AI chatbot, online booking, map routing, live opening-hour feed, or organiser portal is connected.

## Dataset and content

- `data/festivals.json` is the active dataset consumed by the website.
- `data/festivals.csv` is the editable tabular copy of the same active records. Keep it in sync with `festivals.json` when updating event data.
- The active catalogue contains 11 listings whose start dates are after 26 November 2026. Past records are not included in the active catalogue. `data/demo-festivals.json` and `data/demo-festivals.csv` are empty; fictional demo events are not shown as real festival listings.
- `data/FestiNesia_KEN_2026_dataset_diperbarui.csv` is retained as a historical/reference source file and is not the active catalogue used by the UI.
- Event names and local cultural terms remain in their original form. User-facing descriptions, Attraction, Amenities, Accessibility, ticket labels, and date labels are presented in English. Province and administrative-area labels are translated in the UI while canonical dataset values remain unchanged for filtering.
- Some event dates, venue details, prices, amenities, and transport notes still need confirmation. Check the event's official source or organiser before travelling.
- Event-specific official photos were not supplied for all listings. The UI may use clearly labelled illustrative imagery until an accurate image with permission is available.

## Project structure

```text
app/                 Next.js pages, layout, and styles
data/festivals.json  Active event data consumed by the UI
data/festivals.csv   Editable copy of active event data
lib/festivals.ts     Festival types, status, date, and price helpers
lib/trip-planner.ts  Matching and itinerary-generation logic
lib/event-images.ts  Event image selection and fallbacks
public/images/      FestiNesia logo and favicon assets
```

## Deploy

Push the project to the connected Git repository. Vercel detects Next.js and deploys new commits from the configured production branch. Before publishing dataset changes, run `npm run build` and review dates, source links, photo permissions, and any visitor details that could affect travel decisions.
