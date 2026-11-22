import rawFestivals from "@/data/festivals.json";

export type FestivalRecord = {
  no: number;
  nama_event: string;
  top_10_ken: string | null;
  provinsi: string | null;
  kabupaten_kota: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  tanggal_teks: string | null;
  durasi_hari: number | null;
  bulan_mulai: string | null;
  instagram: string | null;
  akses_transportasi: string | null;
  halaman_katalog: number | null;
  catatan: string | null;
  sumber: string | null;
  url_sumber: string | null;
  harga_status: string | null;
  harga_min_rp: number | null;
  harga_maks_rp: number | null;
  harga_keterangan: string | null;
  harga_sumber: string | null;
  harga_dicek: string | null;
  status_tanggal_otomatis: string | null;
  deskripsi_festinesia: string | null;
  atraksi: string | null;
  amenitas: string | null;
  aksesibilitas_festinesia: string | null;
  foto_url: string | null;
  last_verified_event_info: string | null;
  perlu_verifikasi_tanggal: string | null;
  catatan_verifikasi: string | null;
  catatan_sumber_lain: string | null;
  category?: string | null;
  venue?: string | null;
  galeri_foto?: string[] | null;
  photo_source?: string | null;
  data_quality_status?: string | null;
  data_status?: "official" | "demo";
  demo_disclaimer?: string | null;
};

export const officialFestivals = rawFestivals as FestivalRecord[];
// Demo listings have been removed from the active catalogue.
export const demoFestivals: FestivalRecord[] = [];
export const INCLUDE_DEMO_EVENTS = false;
export const demoFestivalCount = 0;
export function eventStatus(event: FestivalRecord, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = event.tanggal_mulai ? parseDate(event.tanggal_mulai) : null;
  const end = event.tanggal_selesai ? parseDate(event.tanggal_selesai) : null;

  if (!start) return "unknown" as const;
  if (end && end < today) return "past" as const;
  if (start > today) return "upcoming" as const;
  // If an event has no published end date, do not invent a duration or call it past.
  if (!end) return "unknown" as const;
  if (end >= today && start <= today) return "ongoing" as const;
  return "unknown" as const;
}

// Keep only ongoing and upcoming listings in the active catalogue.
// Past records are retained separately in the archive CSV.
export const festivals: FestivalRecord[] = officialFestivals.filter((event) => eventStatus(event) !== "past");

function parseDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatDateRange(event: FestivalRecord) {
  if (event.tanggal_teks) return event.tanggal_teks;
  if (event.tanggal_mulai && event.tanggal_selesai) {
    return `${formatSingleDate(event.tanggal_mulai)} – ${formatSingleDate(event.tanggal_selesai)}`;
  }
  if (event.tanggal_mulai) return `${formatSingleDate(event.tanggal_mulai)} · end date to be confirmed`;
  return "Date to be confirmed";
}

function formatSingleDate(value: string) {
  const date = parseDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function priceLabel(event: FestivalRecord) {
  if (/gratis|free/i.test(event.harga_status ?? "")) return "Free entry listed";
  if (typeof event.harga_min_rp === "number" && typeof event.harga_maks_rp === "number") {
    if (event.harga_min_rp === event.harga_maks_rp) {
      return formatRupiah(event.harga_min_rp);
    }
    return `${formatRupiah(event.harga_min_rp)} – ${formatRupiah(event.harga_maks_rp)}`;
  }
  return "Check official source";
}

function formatRupiah(value: number) {
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
