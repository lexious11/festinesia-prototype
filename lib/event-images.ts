import type { FestivalRecord } from "@/lib/festivals";

export type EventImage = { url: string; illustrative: boolean };

// Stock images are used as illustrative placeholders until an event-specific
// image is supplied in foto_url and its accuracy/usage permission is checked.
const imagePool = [
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1100&q=82",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1100&q=82",
];

const foodPattern = /culinary|food|coffee|gastronomy|kuliner|gastronomi|masakan|rasa|makan/i;
const performancePattern = /dance|dancing|art|performance|music|theatre|theater|wayang|tari|seni|barong|janger|kecak|gandrung|reog|carnival/i;
const ritualPattern = /ritual|ceremony|tradition|heritage|adat|tradisi|budaya|keraton|temple|candi/i;
const naturePattern = /lake|danau|mountain|gunung|flower|bunga|fruit|buah|nature|island|pulau|landscape/i;

export function getEventImage(event: FestivalRecord): EventImage {
  const specific = event.foto_url?.trim();
  if (specific && /^https?:\/\//i.test(specific)) {
    return { url: specific, illustrative: false };
  }

  const title = event.nama_event || "";
  const index = Math.abs(((event.no || title.length || 1) - 1) % imagePool.length);
  let poolIndex = index;

  if (foodPattern.test(title)) poolIndex = 2;
  else if (performancePattern.test(title)) poolIndex = index % 2 === 0 ? 0 : 7;
  else if (ritualPattern.test(title)) poolIndex = index % 2 === 0 ? 1 : 5;
  else if (naturePattern.test(title)) poolIndex = index % 2 === 0 ? 3 : 4;

  return { url: imagePool[poolIndex], illustrative: true };
}
