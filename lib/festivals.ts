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
};

export const festivals = rawFestivals as FestivalRecord[];

export function eventStatus(event: FestivalRecord, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = event.tanggal_mulai ? parseDate(event.tanggal_mulai) : null;
  const end = event.tanggal_selesai ? parseDate(event.tanggal_selesai) : start;

  if (!start) return "unknown" as const;
  if (end && end < today) return "past" as const;
  if (start > today) return "upcoming" as const;
  if (end && end >= today && start <= today) return "ongoing" as const;
  return "unknown" as const;
}

function parseDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateRange(event: FestivalRecord) {
  if (event.tanggal_teks) return event.tanggal_teks;
  if (event.tanggal_mulai && event.tanggal_selesai) {
    return `${formatSingleDate(event.tanggal_mulai)} – ${formatSingleDate(event.tanggal_selesai)}`;
  }
  if (event.tanggal_mulai) return formatSingleDate(event.tanggal_mulai);
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
  if (event.harga_status?.toLowerCase().includes("gratis")) return "Free entry listed";
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
