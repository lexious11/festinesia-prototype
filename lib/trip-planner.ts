import { festivals, type FestivalRecord } from "@/lib/festivals";

export type TripPreferences = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  travelers: number;
  interests: string[];
};

export type PlannedActivity = {
  id: string;
  date: string;
  title: string;
  description: string;
  kind: string;
  source: "festival" | "suggestion" | "custom";
  eventNo?: number;
};

export type ItineraryPlan = {
  mode: "generated" | "sample";
  preferences: TripPreferences;
  matches: FestivalRecord[];
  /** Day-by-day schedule: verified festival records plus clearly labelled flexible ideas. */
  activities?: PlannedActivity[];
  /** Maps an event number to the first day of the trip on which it can be visited. */
  visitDates: Record<string, string>;
  dayDates: string[];
  createdAt: string;
  /** Short, transparent reasons explaining why each event appears in the plan. */
  matchReasons?: Record<string, string[]>;
  /** Event IDs deliberately removed by the user while editing this generated plan. */
  removedEventNos?: number[];
};

export function parseLocalISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  // Prevent JavaScript from silently rolling invalid dates (for example, 31 February) into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToISO(value: string, days: number): string {
  const date = parseLocalISODate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

export function listTripDates(startDate: string, endDate: string): string[] {
  const start = parseLocalISODate(startDate);
  const end = parseLocalISODate(endDate);
  if (!start || !end || end < start) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 31) {
    dates.push(toLocalISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function formatTripDate(value: string, includeYear = false): string {
  const date = parseLocalISODate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Dates not selected";
  if (startDate === endDate) return formatTripDate(startDate, true);
  const start = parseLocalISODate(startDate);
  const end = parseLocalISODate(endDate);
  if (!start || !end) return `${startDate} – ${endDate}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = formatTripDate(startDate, !sameYear);
  const endLabel = formatTripDate(endDate, true);
  return `${startLabel} – ${endLabel}`;
}

function normalize(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function destinationMatches(event: FestivalRecord, destination: string): boolean {
  if (destination === "all") return true;
  const eventProvince = normalize(event.provinsi);
  const selected = normalize(destination);
  if (eventProvince === selected) return true;

  const yogyakartaAliases = new Set(["yogyakarta", "di yogyakarta", "daerah istimewa yogyakarta"]);
  return yogyakartaAliases.has(selected) && yogyakartaAliases.has(eventProvince);
}

function interestMatches(event: FestivalRecord, interests: string[]): string[] {
  if (!interests.length) return [];
  const text = normalize([
    event.nama_event,
    event.catatan,
    event.deskripsi_festinesia,
    event.atraksi,
    event.amenitas,
    event.aksesibilitas_festinesia,
  ].filter(Boolean).join(" "));

  const patterns: Record<string, RegExp> = {
    Festivals: /festival|event|carnival|karnaval|perayaan|pesta|pekan|parade|celebration/,
    "Traditional arts": /dance|tari|music|musik|performance|performing|wayang|batik|craft|seni|tradisi|tradition/,
    Culinary: /culinary|food|coffee|kuliner|gastronomi|makan|masakan|rasa/,
    Nature: /nature|alam|lake|danau|mountain|gunung|sea|laut|beach|pantai|landscape/,
    Heritage: /heritage|history|historical|sejarah|keraton|temple|candi|museum|warisan/,
    "Local communities": /community|communities|masyarakat|desa|village|kampung|rakyat|lokal/,
  };

  return interests.filter((interest) => patterns[interest]?.test(text));
}

export function createTripPlan(
  preferences: TripPreferences,
  records: FestivalRecord[] = festivals,
): ItineraryPlan {
  const tripStart = parseLocalISODate(preferences.startDate);
  const tripEnd = parseLocalISODate(preferences.endDate);
  const dayDates = listTripDates(preferences.startDate, preferences.endDate);

  if (!tripStart || !tripEnd || tripEnd < tripStart || !dayDates.length) {
    throw new Error("Please choose a valid travel date range.");
  }
  if (dayDates.length > 7) {
    throw new Error("For this prototype, please choose a trip of up to 7 days.");
  }

  const candidates = records.flatMap((event) => {
    const eventStart = event.tanggal_mulai ? parseLocalISODate(event.tanggal_mulai) : null;
    const eventEnd = event.tanggal_selesai ? parseLocalISODate(event.tanggal_selesai) : eventStart;
    if (!eventStart || !eventEnd) return [];
    if (eventStart > tripEnd || eventEnd < tripStart) return [];
    if (!destinationMatches(event, preferences.destination)) return [];
    const visitDate = eventStart < tripStart ? preferences.startDate : toLocalISODate(eventStart);
    const matchedInterests = interestMatches(event, preferences.interests);
    return [{ event, visitDate, matchedInterests, score: matchedInterests.length }];
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.visitDate.localeCompare(b.visitDate) || a.event.nama_event.localeCompare(b.event.nama_event, "en");
  });

  const matches = candidates.map((candidate) => candidate.event);
  const visitDates = Object.fromEntries(candidates.map((candidate) => [String(candidate.event.no), candidate.visitDate]));
  const matchReasons = Object.fromEntries(candidates.map((candidate) => [
    String(candidate.event.no),
    candidate.matchedInterests.length
      ? candidate.matchedInterests
      : ["Matches your destination and travel dates"],
  ]));
  const plan: ItineraryPlan = {
    mode: "generated",
    preferences,
    matches,
    visitDates,
    matchReasons,
    dayDates,
    createdAt: new Date().toISOString(),
  };
  plan.activities = buildGeneratedActivities(plan);
  return plan;
}

/**
 * Creates a full-day outline without inventing venue names. Festival records remain
 * dataset-backed; all other entries are clearly labelled flexible ideas.
 */
export function buildGeneratedActivities(plan: ItineraryPlan): PlannedActivity[] {
  if (plan.mode !== "generated") return [];
  const activities: PlannedActivity[] = [];
  for (const date of plan.dayDates) {
    const events = plan.matches.filter((event) => plan.visitDates[String(event.no)] === date);
    const base: PlannedActivity[] = [
      {
        id: `idea-${date}-morning`, date,
        title: "Explore local attractions",
        description: "Choose a cultural, heritage, or nature attraction in your destination. Check its location and opening hours before visiting.",
        kind: "Attractions", source: "suggestion",
      },
      {
        id: `idea-${date}-lunch`, date,
        title: "Enjoy a local culinary break",
        description: "Discover regional dishes or a local food area. Select a restaurant and confirm its opening hours independently.",
        kind: "Culinary", source: "suggestion",
      },
    ];
    activities.push(...base);
    events.forEach((event, index) => {
      activities.push({
        id: `festival-${event.no}-${date}`,
        date,
        title: event.nama_event,
        description: "Festival listing matched from the current dataset. Check the official programme for actual session times and venue details.",
        kind: "Festival",
        source: "festival",
        eventNo: event.no,
      });
    });
    if (events.length === 0) {
      activities.push({
        id: `idea-${date}-afternoon`, date,
        title: "Discover local culture and heritage",
        description: "Use this flexible time for a traditional arts experience, museum, craft area, or community activity after checking a real venue.",
        kind: "Culture", source: "suggestion",
      });
    }
    if (events.length < 2) {
      activities.push({
        id: `idea-${date}-evening`, date,
        title: "Evening at your own pace",
        description: "Keep time for rest, a local evening atmosphere, or an activity you choose. Confirm transport options for your return.",
        kind: "Flexible time", source: "suggestion",
      });
    }
  }
  // Activities are appended in a deliberate morning-to-evening sequence for each day.
  return activities;
}

export function ensurePlanActivities(plan: ItineraryPlan): ItineraryPlan {
  if (plan.mode === "generated" && !Array.isArray(plan.activities)) {
    return { ...plan, activities: buildGeneratedActivities(plan) };
  }
  return plan;
}

export function createSamplePlan(): ItineraryPlan {
  const today = toLocalISODate(new Date());
  const startDate = addDaysToISO(today, 7);
  const endDate = addDaysToISO(startDate, 2);
  return {
    mode: "sample",
    preferences: {
      destination: "DI Yogyakarta",
      startDate,
      endDate,
      budget: "Not estimated",
      travelers: 2,
      interests: ["Heritage", "Traditional arts", "Culinary"],
    },
    matches: [],
    visitDates: {},
    dayDates: listTripDates(startDate, endDate),
    createdAt: new Date().toISOString(),
  };
}
