import { festivals, type FestivalRecord } from "@/lib/festivals";

export type TripPreferences = {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  travelers: number;
  interests: string[];
};

export type ItineraryPlan = {
  mode: "generated" | "sample";
  preferences: TripPreferences;
  matches: FestivalRecord[];
  /** Maps an event number to the first day of the trip on which it can be visited. */
  visitDates: Record<string, string>;
  dayDates: string[];
  createdAt: string;
};

export function parseLocalISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
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

  // The user-facing label "Yogyakarta" is also used for the dataset value "DI Yogyakarta".
  if (selected === "yogyakarta") {
    return eventProvince === "di yogyakarta" || eventProvince === "daerah istimewa yogyakarta";
  }
  return false;
}

function interestScore(event: FestivalRecord, interests: string[]): number {
  if (!interests.length) return 0;
  const text = normalize([
    event.nama_event,
    event.catatan,
    event.deskripsi_festinesia,
    event.atraksi,
    event.amenitas,
  ].filter(Boolean).join(" "));

  const patterns: Record<string, RegExp> = {
    Festivals: /festival|event|carnival|karnaval|perayaan|pesta|pekan|parade|celebration/,
    "Traditional arts": /dance|tari|music|musik|performance|performing|wayang|batik|craft|seni|tradisi|tradition/,
    Culinary: /culinary|food|coffee|kuliner|gastronomi|makan|masakan|rasa/,
    Nature: /nature|alam|lake|danau|mountain|gunung|sea|laut|beach|pantai|landscape/,
    Heritage: /heritage|history|historical|sejarah|keraton|temple|candi|museum|warisan/,
    "Local communities": /community|communities|masyarakat|desa|village|kampung|rakyat|lokal/,
  };

  return interests.reduce((score, interest) => score + (patterns[interest]?.test(text) ? 1 : 0), 0);
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

  const candidates = records.flatMap((event) => {
    const eventStart = event.tanggal_mulai ? parseLocalISODate(event.tanggal_mulai) : null;
    const eventEnd = event.tanggal_selesai ? parseLocalISODate(event.tanggal_selesai) : eventStart;
    if (!eventStart || !eventEnd) return [];
    if (eventStart > tripEnd || eventEnd < tripStart) return [];
    if (!destinationMatches(event, preferences.destination)) return [];
    const visitDate = eventStart < tripStart ? preferences.startDate : toLocalISODate(eventStart);
    return [{ event, visitDate, score: interestScore(event, preferences.interests) }];
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.visitDate.localeCompare(b.visitDate) || a.event.nama_event.localeCompare(b.event.nama_event, "en");
  });

  return {
    mode: "generated",
    preferences,
    matches: candidates.map((candidate) => candidate.event),
    visitDates: Object.fromEntries(candidates.map((candidate) => [String(candidate.event.no), candidate.visitDate])),
    dayDates,
    createdAt: new Date().toISOString(),
  };
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
