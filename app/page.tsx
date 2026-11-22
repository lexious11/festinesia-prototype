"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  eventStatus,
  festivals,
  formatDateRange,
  priceLabel,
  type FestivalRecord,
} from "@/lib/festivals";
import { getEventImage } from "@/lib/event-images";
import {
  createSamplePlan,
  createTripPlan,
  ensurePlanActivities,
  formatTripDate,
  formatTripDateRange,
  listTripDates,
  parseLocalISODate,
  toLocalISODate,
  type ItineraryPlan,
  type TripPreferences,
} from "@/lib/trip-planner";

type View = "home" | "explore" | "event" | "planner" | "itinerary" | "destinations";
type Category = "All" | "Festivals" | "Performances" | "Museums" | "Culinary" | "Traditions" | "Village tourism";
type DetailTab = "Overview" | "Attraction" | "Amenities" | "Accessibility" | "Travel tips" | "Reviews";
type Timing = "all" | "upcoming" | "ongoing" | "past";

const ITINERARY_STORAGE_KEY = "festinesia:itinerary:v1";

type Destination = { name: string; province: string; description: string; image: string; tag: string };

const imagePool = [
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85",
];

const destinations: Destination[] = [
  { name: "Bali", province: "Bali", description: "Island ceremonies, performing arts, temples, and coastal traditions.", image: imagePool[0], tag: "Living traditions" },
  { name: "Yogyakarta", province: "Daerah Istimewa Yogyakarta", description: "Royal heritage, batik, traditional performances, and historic landmarks.", image: imagePool[6], tag: "Art & heritage" },
  { name: "Lake Toba", province: "Sumatera Utara", description: "Batak culture, lakeside landscapes, music, and community celebrations.", image: imagePool[5], tag: "Culture & nature" },
  { name: "West Java", province: "Jawa Barat", description: "Creative festivals, traditional arts, food culture, and mountain escapes.", image: imagePool[2], tag: "Creative culture" },
  { name: "East Java", province: "Jawa Timur", description: "Colorful parades, local rituals, dramatic landscapes, and regional food.", image: imagePool[1], tag: "Festivals & folklore" },
  { name: "Aceh", province: "Aceh", description: "Distinctive culinary traditions, coffee culture, and community festivals.", image: imagePool[3], tag: "Food & community" },
];

const provinces = Array.from(
  new Set(festivals.map((event) => event.provinsi?.trim()).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "en"));

const provinceDisplayNames: Record<string, string> = {
  "Kalimantan Barat": "West Kalimantan",
  "Kalimantan Timur": "East Kalimantan",
  "Kalimantan Selatan": "South Kalimantan",
  "Kalimantan Tengah": "Central Kalimantan",
  "Kalimantan Utara": "North Kalimantan",
  "Sulawesi Tengah": "Central Sulawesi",
  "Sulawesi Selatan": "South Sulawesi",
  "Sulawesi Utara": "North Sulawesi",
  "Sulawesi Tenggara": "Southeast Sulawesi",
  "Sulawesi Barat": "West Sulawesi",
  "Sumatera Utara": "North Sumatra",
  "Sumatera Barat": "West Sumatra",
  "Sumatera Selatan": "South Sumatra",
  "Jawa Barat": "West Java",
  "Jawa Tengah": "Central Java",
  "Jawa Timur": "East Java",
  "Nusa Tenggara Barat": "West Nusa Tenggara",
  "Nusa Tenggara Timur": "East Nusa Tenggara",
  "Papua Pegunungan": "Highland Papua",
  "Papua Barat": "West Papua",
  "Papua Selatan": "South Papua",
  "Papua Tengah": "Central Papua",
  "DI Yogyakarta": "Special Region of Yogyakarta",
};

function displayProvinceName(value: string) {
  return provinceDisplayNames[value] ?? value;
}

function displayAdministrativeArea(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/^Kabupaten\s+/i, "")
    .replace(/^Kab\.\s*/i, "")
    .replace(/^Kota Administrasi\s+/i, "")
    .replace(/^Kota Adm\.\s*/i, "")
    .replace(/^Kota\s+/i, "")
    .replace(/^Kabupaten$/, "");
}

function locationLabel(event: FestivalRecord) {
  const area = displayAdministrativeArea(event.kabupaten_kota);
  const province = event.provinsi ? displayProvinceName(event.provinsi) : "";
  const areaLabel = area ? (/^(Kota|Kabupaten|Kab\.)/i.test(event.kabupaten_kota ?? "") ? `${area} ${/^(Kota)/i.test(event.kabupaten_kota ?? "") ? "City" : "Regency"}` : area) : "";
  return [areaLabel, province].filter(Boolean).join(", ") || "Indonesia";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function categoryMatch(event: FestivalRecord, category: Category) {
  if (category === "All") return true;
  const title = event.nama_event.toLowerCase();
  const notes = `${event.catatan || ""} ${event.deskripsi_festinesia || ""}`.toLowerCase();
  const text = `${title} ${notes}`;
  if (category === "Culinary") return /culinary|food|coffee|kuliner|gastronomi|rasa|makan/.test(text);
  if (category === "Performances") return /dance|music|performance|theatre|theater|tari|seni|wayang|music|gandrung|kecak|reog/.test(text);
  if (category === "Traditions") return /culture|tradition|heritage|adat|budaya|ritual|serumpun|tabuik/.test(text);
  if (category === "Museums") return /museum/.test(text);
  if (category === "Village tourism") return /village|desa wisata|kampung/.test(text);
  return /festival|fest|event|perayaan|pekan|pesta|carnival|karnaval|pesona|parade|celebration/.test(text);
}

function getEventPhoto(event: FestivalRecord, offset = 0) {
  const photo = getEventImage(event);
  const backup = imagePool[Math.abs((event.no + offset) % imagePool.length)];
  return { url: photo.url || backup, illustrative: photo.illustrative ?? true };
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" aria-label="FestiNesia home" onClick={onClick}>
      <img
        className="brand-logo"
        src="/images/FestiNesia_Logo_Horizontal.png"
        alt="FestiNesia — Culture, closer than ever"
      />
    </button>
  );
}

function StatusPill({ event }: { event: FestivalRecord }) {
  const status = eventStatus(event);
  const label = status === "upcoming" ? "Upcoming" : status === "ongoing" ? "Happening now" : status === "past" ? "Past event" : "Date to confirm";
  return <span className={`status-pill status-${status}`}>{label}</span>;
}

function EventCard({
  event,
  onOpen,
  isFavorite,
  onToggleFavorite,
  compact = false,
}: {
  event: FestivalRecord;
  onOpen: (event: FestivalRecord) => void;
  isFavorite: boolean;
  onToggleFavorite: (event: FestivalRecord) => void;
  compact?: boolean;
}) {
  const photo = getEventPhoto(event);
  return (
    <article className={`event-card ${compact ? "event-card-compact" : ""}`}>
      <div className="event-photo-wrap">
        <button className="event-photo-button" onClick={() => onOpen(event)} aria-label={`View ${event.nama_event}`}>
          <img className="event-photo" src={photo.url} alt={photo.illustrative ? `Illustrative cultural travel photo for ${event.nama_event}` : event.nama_event} loading="lazy" onError={(e) => { const img = e.currentTarget; if (img.dataset.fallback !== "1") { img.dataset.fallback = "1"; img.src = imagePool[(event.no + 2) % imagePool.length]; } }} />
          <span className="photo-shade" />
          <StatusPill event={event} />
          {photo.illustrative && <span className="image-disclaimer">Illustrative photo</span>}
        </button>
        <button className={`favorite-button ${isFavorite ? "is-favorite" : ""}`} onClick={() => onToggleFavorite(event)} aria-label={isFavorite ? "Remove from saved events" : "Save event"} aria-pressed={isFavorite}>{isFavorite ? "♥" : "♡"}</button>
      </div>
      <div className="event-card-body">
        <div className="event-card-date"><span>▦</span>{formatDateRange(event)}</div>
        <button className="event-card-title" onClick={() => onOpen(event)}>{event.nama_event}</button>
        <div className="event-card-location"><span>⌖</span><span>{locationLabel(event)}</span></div>
        <div className="event-card-bottom"><span className="event-price">{priceLabel(event)}</span><button className="card-arrow" onClick={() => onOpen(event)} aria-label={`Open ${event.nama_event}`}>↗</button></div>
      </div>
    </article>
  );
}

function ComingSoonModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="coming-modal" role="dialog" aria-modal="true" aria-labelledby="coming-title">
        <button className="icon-button modal-x" onClick={onClose} aria-label="Close">×</button>
        <span className="coming-icon">✦</span>
        <div className="eyebrow">FESTINESIA PREVIEW</div>
        <h2 id="coming-title">Coming soon</h2>
        <p><strong>{feature}</strong> is part of the FestiNesia roadmap. This prototype shows where the feature will live, but it is not connected yet.</p>
        <button className="button button-primary button-wide" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}

function DetailGallery({ event, onGalleryClick }: { event: FestivalRecord; onGalleryClick: () => void }) {
  const photo = getEventPhoto(event);
  const galleryImages = [photo.url, imagePool[(event.no + 1) % imagePool.length], imagePool[(event.no + 3) % imagePool.length], imagePool[(event.no + 5) % imagePool.length]];
  return (
    <div className="detail-gallery">
      <button className="gallery-main" onClick={onGalleryClick} aria-label="Open photo gallery"><img src={galleryImages[0]} alt={`Illustrative photo for ${event.nama_event}`} /><span className="gallery-photo-label">Illustrative imagery</span></button>
      <div className="gallery-side">
        {galleryImages.slice(1).map((src, i) => <button key={`${src}-${i}`} onClick={onGalleryClick}><img src={src} alt="Cultural travel image" loading="lazy" /></button>)}
        <button className="gallery-more" onClick={onGalleryClick}><span>▦</span> View gallery preview</button>
      </div>
    </div>
  );
}

function DetailPage({
  event,
  onBack,
  onComingSoon,
  favorite,
  onFavorite,
}: {
  event: FestivalRecord;
  onBack: () => void;
  onComingSoon: (feature: string) => void;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("Overview");
  const photo = getEventPhoto(event);
  const access = event.aksesibilitas_festinesia?.trim() || event.akses_transportasi?.trim();
  const tabs: DetailTab[] = ["Overview", "Attraction", "Amenities", "Accessibility", "Travel tips", "Reviews"];
  return (
    <main className="content-page detail-page">
      <button className="back-link" onClick={onBack}>← Back to explore</button>
      <div className="detail-title-row">
        <div className="detail-title-copy"><div className="eyebrow">CULTURAL EVENT GUIDE</div><h1>{event.nama_event}</h1><div className="detail-location"><span>⌖</span> {locationLabel(event)}</div><div className="detail-title-meta"><span>▦ {formatDateRange(event)}</span><span className="meta-dot">•</span><StatusPill event={event} /></div></div>
        <div className="detail-actions"><button className={`button button-secondary save-detail ${favorite ? "is-favorite" : ""}`} onClick={onFavorite}>{favorite ? "♥ Saved" : "♡ Save event"}</button><button className="button button-primary" onClick={() => onComingSoon("Personalised trip planning for this event")}>Plan a trip <span>↗</span></button></div>
      </div>
      <DetailGallery event={event} onGalleryClick={() => onComingSoon("Full event photo gallery")} />
      <div className="illustrative-note">Photos are illustrative and may not depict this specific event. Official event photos will be added as verified sources become available.</div>
      <div className="detail-tabs" role="tablist" aria-label="Event information">
        {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "tab-active" : ""} onClick={() => setTab(item)}>{item}{item === "Reviews" && <span className="soon-mini">SOON</span>}</button>)}
      </div>
      {tab === "Overview" && <>
        <section className="event-about-layout"><div><div className="section-kicker">GET TO KNOW THE EVENT</div><h2>About {event.nama_event}</h2><p>{event.deskripsi_festinesia?.trim() || "A dedicated description for this event has not been verified yet. Explore the public source links below for the latest programme, dates, and visitor information."}</p><p className="soft-paragraph">FestiNesia is building practical event guides that bring together cultural highlights and visitor information. Details will be expanded as reliable sources are reviewed.</p></div>
          <div className="event-facts"><div className="fact-card"><span className="fact-icon peach">✺</span><small>Event type</small><strong>Culture & festival</strong></div><div className="fact-card"><span className="fact-icon blue">⌖</span><small>Location</small><strong>{locationLabel(event)}</strong></div><div className="fact-card"><span className="fact-icon mint">▦</span><small>Event dates</small><strong>{formatDateRange(event)}</strong></div><div className="fact-card"><span className="fact-icon coral">Rp</span><small>Ticket information</small><strong>{priceLabel(event)}</strong></div></div></section>
        <ThreeASection event={event} />
        <SourcePanel event={event} />
      </>}
      {tab === "Attraction" && <InfoTab icon="✺" title="What can you experience?" content={event.atraksi?.trim()} empty="Programme highlights, performances, workshops, and cultural activities will be added once verified." />}
      {tab === "Amenities" && <InfoTab icon="⌂" title="Facilities around the event" content={event.amenitas?.trim()} empty="Nearby toilets, food options, rest areas, accommodation, and accessibility facilities have not been verified for this listing yet." />}
      {tab === "Accessibility" && <InfoTab icon="↗" title="Getting there" content={access || undefined} empty="Verified transport routes, journey times, and local mobility information will be added as reliable details become available." />}
      {tab === "Travel tips" && <InfoTab icon="✧" title="Plan a smoother visit" empty="A curated checklist for weather, local customs, venue rules, and transport is coming soon. Always confirm details with the organiser before travelling." />}
      {tab === "Reviews" && <ComingSoonInline feature="Visitor reviews and ratings" />}
    </main>
  );
}

function ThreeASection({ event }: { event: FestivalRecord }) {
  const items = [
    { name: "Attraction", icon: "✺", className: "peach", text: event.atraksi?.trim() || "Programme and cultural highlights are not verified for this listing yet." },
    { name: "Amenities", icon: "⌂", className: "mint", text: event.amenitas?.trim() || "Facilities such as restrooms, food options, and nearby accommodation need confirmation." },
    { name: "Accessibility", icon: "↗", className: "blue", text: event.aksesibilitas_festinesia?.trim() || event.akses_transportasi?.trim() || "Verified transport details are not available yet." },
  ];
  return <section className="three-a-section"><div className="section-heading-inline"><div><div className="section-kicker">THE TOURISM 3A CHECKLIST</div><h2>Know before you go</h2></div><span className="muted-badge">Information may be incomplete</span></div><div className="three-a-grid-v3">{items.map((item) => <article key={item.name} className="three-a-card-v3"><span className={`fact-icon ${item.className}`}>{item.icon}</span><h3>{item.name}</h3><p>{item.text}</p></article>)}</div></section>;
}

function SourcePanel({ event }: { event: FestivalRecord }) {
  const rawLinks = [
    event.url_sumber ? { label: "Open event information", url: event.url_sumber } : null,
    event.harga_sumber ? { label: "Ticket information", url: event.harga_sumber } : null,
    event.instagram ? { label: "Instagram profile", url: `https://www.instagram.com/${event.instagram.replace(/^@/, "")}/` } : null,
  ].filter((item): item is { label: string; url: string } => Boolean(item && /^https?:\/\//.test(item.url)));
  // Some records use the same official page for event and ticket information.
  // Render each URL once to avoid duplicate React keys and duplicate links.
  const links = Array.from(new Map(rawLinks.map((item) => [item.url, item])).values());
  return <section className="source-panel"><div className="source-symbol">ⓘ</div><div className="source-copy"><strong>Before you go</strong><p>Event dates and details may change. Confirm current information with the organiser or official source before travelling.</p><small>{event.last_verified_event_info ? `Information last checked ${event.last_verified_event_info}.` : "Information verification date not recorded."}</small></div><div className="source-links">{links.length ? links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>) : <span>Direct source link unavailable</span>}</div></section>;
}

function InfoTab({ icon, title, content, empty }: { icon: string; title: string; content?: string; empty: string }) {
  return <section className="info-tab-panel"><span className="large-info-icon">{icon}</span><div className="section-kicker">VISITOR INFORMATION</div><h2>{title}</h2>{content ? <p>{content}</p> : <><p>{empty}</p><span className="muted-badge">Details to be verified</span></>}</section>;
}

function ComingSoonInline({ feature }: { feature: string }) {
  return <section className="info-tab-panel inline-coming"><span className="large-info-icon">✦</span><div className="section-kicker">ON THE ROADMAP</div><h2>Coming soon</h2><p>{feature} will be available in a future version of FestiNesia.</p></section>;
}

function HomeLanding({
  onNavigate,
  onExploreSearch,
  onOpenEvent,
  favorites,
  onToggleFavorite,
  onComingSoon,
}: {
  onNavigate: (view: View) => void;
  onExploreSearch: (query: string) => void;
  onOpenEvent: (event: FestivalRecord) => void;
  favorites: Set<number>;
  onToggleFavorite: (event: FestivalRecord) => void;
  onComingSoon: (feature: string) => void;
}) {
  const [heroSearch, setHeroSearch] = useState("");
  const [heroDate, setHeroDate] = useState("");
  const [heroBudget, setHeroBudget] = useState("Any budget");
  const upcomingCount = festivals.filter((event) => ["upcoming", "ongoing"].includes(eventStatus(event))).length;
  const provinceCount = new Set(festivals.map((event) => event.provinsi).filter(Boolean)).size;
  const popular = [...festivals].sort((a, b) => (a.tanggal_mulai || "9999-12-31").localeCompare(b.tanggal_mulai || "9999-12-31") || a.nama_event.localeCompare(b.nama_event, "en")).slice(0, 4);
  const destinationsStrip = destinations.slice(0, 3);
  return (
    <main>
      <section className="home-hero">
        <div className="home-hero-photo" />
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <div className="hero-eyebrow"><span className="eyebrow-dot" /> YOUR CULTURAL JOURNEY STARTS HERE</div>
          <h1>Discover festivals.<br />Explore <em>Indonesia.</em></h1>
          <p>Find the local celebrations, art, flavours, and living traditions that make every corner of Indonesia unforgettable.</p>
          <form className="hero-search-panel" onSubmit={(e) => { e.preventDefault(); if (heroDate || heroBudget !== "Any budget") { onComingSoon("Date and budget filtering from the home search"); } else { onExploreSearch(heroSearch); } }}>
            <label className="hero-search-field"><span>⌕</span><input value={heroSearch} onChange={(e) => setHeroSearch(e.target.value)} placeholder="Festival, destination, or province" aria-label="Festival, destination, or province" /></label>
            <label className="hero-search-field date-field"><span>▦</span><input value={heroDate} onChange={(e) => setHeroDate(e.target.value)} placeholder="When?" aria-label="Travel date" onFocus={(e) => { e.currentTarget.type = "date"; }} onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.type = "text"; }} /></label>
            <label className="hero-search-field budget-field"><span>◈</span><select value={heroBudget} onChange={(e) => setHeroBudget(e.target.value)} aria-label="Budget"><option>Any budget</option><option>Under Rp500,000</option><option>Rp500,000–1,000,000</option><option>Rp1,000,000–2,000,000</option></select></label>
            <button className="button button-primary hero-search-submit" type="submit">Explore <span>↗</span></button>
          </form>
          <div className="hero-trust-line"><span>✦</span> Festival listings <i /> Cultural discovery <i /> Trip inspiration</div>
        </div>
        <div className="hero-vertical-note">THE ARCHIPELAGO, ONE STORY AT A TIME</div>
        <div className="hero-caption"><span /> A journey into local culture</div>
      </section>
      <section className="stats-bar"><div className="stat-cell"><span className="stat-icon stat-green">✺</span><div><strong>{festivals.length}</strong><small>Festival listings</small></div></div><span className="stat-separator" /><div className="stat-cell"><span className="stat-icon stat-orange">◷</span><div><strong>{upcomingCount}</strong><small>Upcoming or ongoing*</small></div></div><span className="stat-separator" /><div className="stat-cell"><span className="stat-icon stat-blue">⌖</span><div><strong>{provinceCount}</strong><small>Provinces represented</small></div></div><p className="stats-note">*Calculated from the current active event dataset. Confirm event details with official sources.</p></section>
      <section className="home-feature-row page-width"><button className="home-feature" onClick={() => onNavigate("explore")}><span className="feature-icon icon-orange">▣</span><strong>Festivals & events</strong><small>Discover cultural celebrations across Indonesia.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onNavigate("destinations")}><span className="feature-icon icon-blue">⌖</span><strong>Cultural destinations</strong><small>Explore regions known for living traditions.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onNavigate("planner")}><span className="feature-icon icon-purple">✧</span><strong>Trip planner</strong><small>Plan a cultural trip around your dates and interests.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onComingSoon("Complete 3A destination guides")}><span className="feature-icon icon-green">▤</span><strong>3A information</strong><small>Attractions, amenities, and accessibility.</small><span className="feature-arrow">↗</span></button></section>
      <section className="home-section page-width">
        <div className="section-head"><div><div className="section-kicker">A GOOD PLACE TO START</div><h2>Popular festivals</h2><p>Browse event references from across the archipelago.</p></div><button className="text-arrow" onClick={() => onNavigate("explore")}>View all events <span>→</span></button></div>
        <div className="event-grid-home">{popular.map((event) => <EventCard key={event.no} event={event} onOpen={onOpenEvent} isFavorite={favorites.has(event.no)} onToggleFavorite={onToggleFavorite} compact />)}</div>
      </section>
      <section className="destination-preview page-width"><div className="section-head"><div><div className="section-kicker">GO BEYOND THE USUAL</div><h2>Places full of stories</h2><p>A few places to begin exploring cultural Indonesia.</p></div><button className="text-arrow" onClick={() => onNavigate("destinations")}>Explore destinations <span>→</span></button></div><div className="destination-strip">{destinationsStrip.map((destination) => <button className="destination-mini" key={destination.name} onClick={() => onNavigate("destinations")}><img src={destination.image} alt={`${destination.name} destination imagery`} loading="lazy" /><span className="destination-mini-shade" /><span className="destination-mini-content"><small>{destination.tag}</small><strong>{destination.name}</strong><span>{destination.province}</span></span></button>)}</div></section>
      <section className="approach-band"><div className="approach-band-inner page-width"><div><div className="section-kicker">MORE THAN A FESTIVAL LIST</div><h2>Know before you go.</h2><p>FestiNesia brings cultural discovery and practical visitor information into one place. We are building the tourism 3A picture one verified detail at a time.</p></div><div className="approach-3a-mini"><div><span className="three-a-icon peach">✺</span><strong>Attraction</strong><small>What to experience</small></div><div><span className="three-a-icon mint">⌂</span><strong>Amenities</strong><small>What is nearby</small></div><div><span className="three-a-icon blue">↗</span><strong>Accessibility</strong><small>How to get there</small></div></div></div></section>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

function ExplorePage({
  onOpenEvent,
  favorites,
  onToggleFavorite,
  initialQuery,
}: {
  onOpenEvent: (event: FestivalRecord) => void;
  favorites: Set<number>;
  onToggleFavorite: (event: FestivalRecord) => void;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [province, setProvince] = useState("all");
  const [timing, setTiming] = useState<Timing>("all");
  const [category, setCategory] = useState<Category>("All");
  const [budget, setBudget] = useState("all");
  const [visible, setVisible] = useState(12);
  const [sortBy, setSortBy] = useState<"date" | "name" | "saved">("date");
  const categories: Category[] = ["All", "Festivals", "Performances", "Museums", "Culinary", "Traditions", "Village tourism"];
  const results = useMemo(() => festivals.filter((event) => {
    const haystack = [event.nama_event, event.provinsi, event.kabupaten_kota, event.akses_transportasi].filter(Boolean).join(" ").toLowerCase();
    const status = eventStatus(event);
    const min = event.harga_min_rp;
    const queryMatch = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const provinceMatch = province === "all" || event.provinsi === province;
    const timeMatch = timing === "all" || status === timing;
    const budgetMatch = budget === "all" || (budget === "free" ? (min === 0 || /gratis|free/i.test(event.harga_status || "")) : budget === "under500" ? (typeof min === "number" && min > 0 && min < 500000) : budget === "under1m" ? (typeof min === "number" && min <= 1000000) : true);
    return queryMatch && provinceMatch && timeMatch && categoryMatch(event, category) && budgetMatch;
  }).filter((event) => sortBy !== "saved" || favorites.has(event.no))
    .sort((a, b) => {
      if (sortBy === "name") return a.nama_event.localeCompare(b.nama_event, "en");
      if (sortBy === "saved") return a.nama_event.localeCompare(b.nama_event, "en");
      const aDate = a.tanggal_mulai ? new Date(`${a.tanggal_mulai}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.tanggal_mulai ? new Date(`${b.tanggal_mulai}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate || a.nama_event.localeCompare(b.nama_event, "en");
    }), [query, province, timing, category, budget, sortBy, favorites]);
  const clear = () => { setQuery(""); setProvince("all"); setTiming("all"); setCategory("All"); setBudget("all"); setVisible(12); };
  return <main className="content-page explore-page"><div className="page-intro"><div className="section-kicker">FIND YOUR NEXT CULTURAL EXPERIENCE</div><h1>Explore festivals & culture</h1><p>Discover events across Indonesia, from regional celebrations to living traditions.</p></div>
    <div className="explore-search-row"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setVisible(12); }} placeholder="Search a festival, destination, or city..." aria-label="Search event listings" /><kbd>/</kbd><span className="search-results-total">{results.length} listings</span></div>
    <div className="category-scroll">{categories.map((item) => <button key={item} onClick={() => { setCategory(item); setVisible(12); }} className={`category-chip ${category === item ? "category-active" : ""}`}>{item}</button>)}</div>
    <div className="explore-layout"><aside className="filters-sidebar"><div className="filters-heading"><strong>Filters</strong><button onClick={clear}>Reset</button></div><label className="filter-group"><span>Location</span><select value={province} onChange={(e) => setProvince(e.target.value)} aria-label="Choose a destination"><option value="all">All provinces</option>{provinces.map((p) => <option key={p} value={p}>{displayProvinceName(p)}</option>)}</select></label><label className="filter-group"><span>When</span><select value={timing} onChange={(e) => setTiming(e.target.value as Timing)}><option value="all">Any time</option><option value="upcoming">Upcoming</option><option value="ongoing">Happening now</option></select></label><div className="filter-group"><span>Budget guidance</span><label className="radio-line"><input type="radio" name="budget" checked={budget === "all"} onChange={() => setBudget("all")} /> Any budget</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "free"} onChange={() => setBudget("free")} /> Free entry listed</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "under500"} onChange={() => setBudget("under500")} /> Under Rp500,000</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "under1m"} onChange={() => setBudget("under1m")} /> Up to Rp1,000,000</label></div><div className="filter-help"><span>ⓘ</span><p>Event dates, ticket details, and visitor information can change. Confirm current details with the organiser or official source before travelling.</p></div></aside>
      <section className="results-main"><div className="results-heading"><div><h2>{category === "All" ? "Cultural events" : category}</h2><p>Showing {Math.min(visible, results.length)} of {results.length} listings</p></div><label className="sort-select">Sort by <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as "date" | "name" | "saved"); setVisible(12); }}><option value="date">Nearest date</option><option value="name">Name A–Z</option><option value="saved">Saved events</option></select></label></div>
      {results.length ? <div className="event-grid-explore">{results.slice(0, visible).map((event) => <EventCard key={event.no} event={event} onOpen={onOpenEvent} isFavorite={favorites.has(event.no)} onToggleFavorite={onToggleFavorite} />)}</div> : <div className="empty-results"><span>⌕</span><h3>{sortBy === "saved" ? "No saved events yet" : "No matches found"}</h3><p>{sortBy === "saved" ? "Save a festival using the heart icon on an event card to see it here." : "Try removing a filter or searching for another location."}</p>{sortBy === "saved" ? <button className="button button-primary" onClick={() => setSortBy("date")}>Browse all events</button> : <button className="button button-primary" onClick={clear}>Clear all filters</button>}</div>}
      {visible < results.length && <button className="button button-secondary show-more" onClick={() => setVisible((v) => v + 12)}>Load more events ↓</button>}
      <div className="dataset-disclaimer"><span>ⓘ</span><p><strong>A note on event data.</strong> The active catalogue focuses on ongoing and upcoming festival listings. Some dates, ticket prices, venue details, and visitor facilities still require confirmation; check official organiser sources before travelling.</p></div>
      </section></div><Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
  </main>;
}

function PlannerPage({
  onCreatePlan,
  onShowItinerary,
  initialPreferences,
}: {
  onCreatePlan: (preferences: TripPreferences) => void;
  onShowItinerary: () => void;
  initialPreferences?: TripPreferences;
}) {
  const [province, setProvince] = useState(initialPreferences?.destination ?? "all");
  const [startDate, setStartDate] = useState(initialPreferences?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialPreferences?.endDate ?? "");
  const [budget, setBudget] = useState(initialPreferences?.budget ?? "Not sure yet");
  const [travelers, setTravelers] = useState(initialPreferences?.travelers ?? 2);
  const [interest, setInterest] = useState<string[]>(initialPreferences?.interests ?? ["Festivals", "Traditional arts", "Culinary"]);
  const [formError, setFormError] = useState("");
  const [today] = useState(() => toLocalISODate(new Date()));
  const interests = ["Festivals", "Traditional arts", "Culinary", "Nature", "Heritage", "Local communities"];
  const toggleInterest = (item: string) => {
    setInterest((old) => old.includes(item) ? old.filter((v) => v !== item) : [...old, item]);
    setFormError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = parseLocalISODate(startDate);
    const end = parseLocalISODate(endDate);
    const todayDate = parseLocalISODate(today);

    if (!startDate || !endDate || !start || !end) {
      setFormError("Please select both your start and end dates.");
      return;
    }
    if (todayDate && start < todayDate) {
      setFormError("Your travel start date cannot be in the past.");
      return;
    }
    if (end < start) {
      setFormError("Your end date must be on or after your start date.");
      return;
    }
    const tripDays = listTripDates(startDate, endDate);
    if (tripDays.length < 1 || tripDays.length > 7) {
      setFormError("For this prototype, please choose a trip between 1 and 7 days.");
      return;
    }
    if (travelers < 1 || travelers > 12) {
      setFormError("Please choose between 1 and 12 travellers.");
      return;
    }
    if (!interest.length) {
      setFormError("Please choose at least one interest so we can rank relevant events.");
      return;
    }

    setFormError("");
    onCreatePlan({ destination: province, startDate, endDate, budget, travelers, interests: interest });
  };

  return (
    <main className="content-page planner-page">
      <div className="page-intro">
        <div className="section-kicker">A JOURNEY MADE AROUND YOU</div>
        <h1>Trip Planner</h1>
        <p>Plan a cultural getaway around your destination, travel dates, budget, and interests.</p>
      </div>
      <div className="planner-banner">
        <div>
          <span className="planner-banner-icon">✦</span>
          <div>
            <strong>Your next story starts here</strong>
            <p>Choose your preferences to find matching festivals. We also add flexible activity ideas to create a day-by-day outline.</p>
          </div>
        </div>
        <span className="coming-badge">CURRENT EVENT DATASET</span>
      </div>
      <div className="planner-layout">
        <form className="planner-settings" onSubmit={handleSubmit} noValidate>
          <div className="form-card-head">
            <span className="form-head-icon">✧</span>
            <div>
              <h2>Build your trip</h2>
              <p>Set your preferences to build a day-by-day cultural trip.</p>
            </div>
          </div>
          <label className="full-field">
            <span>Where would you like to go?</span>
            <select value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="all">Anywhere in Indonesia</option>
              {provinces.map((p) => <option key={p} value={p}>{displayProvinceName(p)}</option>)}
            </select>
          </label>
          <div className="field-two-col">
            <label className="full-field"><span>Start date</span><input type="date" min={today} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value && endDate < e.target.value) setEndDate(e.target.value); setFormError(""); }} required /></label>
            <label className="full-field"><span>End date</span><input type="date" min={startDate || today} value={endDate} onChange={(e) => { setEndDate(e.target.value); setFormError(""); }} required /></label>
          </div>
          <label className="full-field">
            <span>Travel budget per person (planning preference)</span>
            <select value={budget} onChange={(e) => { setBudget(e.target.value); setFormError(""); }}>
              <option>Under Rp500,000</option><option>Rp500,000 – 1,000,000</option><option>Rp1,000,000 – 2,000,000</option><option>Over Rp2,000,000</option><option>Not sure yet</option>
            </select>
          </label>
          <div className="full-field">
            <span>What are you interested in?</span>
            <div className="interest-chips">{interests.map((item) => <button type="button" key={item} className={interest.includes(item) ? "interest-selected" : ""} onClick={() => toggleInterest(item)} aria-pressed={interest.includes(item)}>{interest.includes(item) && <span>✓ </span>}{item}</button>)}</div>
          </div>
          <div className="travelers-field">
            <span>Number of travellers</span>
            <div className="stepper"><button type="button" onClick={() => { setTravelers((n) => Math.max(1, n - 1)); setFormError(""); }} aria-label="Remove traveller">−</button><strong>{travelers}</strong><button type="button" onClick={() => { setTravelers((n) => Math.min(12, n + 1)); setFormError(""); }} aria-label="Add traveller">+</button></div>
          </div>
          {formError && <p className="planner-form-error" role="alert">{formError}</p>}
          <button className="button button-primary button-wide planner-generate" type="submit">Create My Itinerary <span>↗</span></button>
          <p className="form-note">We place matching festival listings into your trip and add flexible ideas for open time. These ideas are not confirmed venues. Budget is a preference only; total transport, accommodation, and meal costs are not calculated.</p>
        </form>
        <aside className="planner-guide" aria-labelledby="planner-guide-title">
          <div className="guide-header">
            <span className="guide-header-icon" aria-hidden="true">⌖</span>
            <div>
              <h2 id="planner-guide-title">Trip Planning Guide</h2>
              <p>Helpful information for planning a cultural visit</p>
            </div>
            <span className="guide-3a-mark">3A</span>
          </div>
          <div className="guide-content">
            <section className="guide-intro-card">
              <strong>Plan a meaningful cultural journey</strong>
              <p>Choose your destination, travel dates, budget, and interests to find festival listings that may fit your trip.</p>
            </section>
            <div className="guide-section-label">HOW IT WORKS</div>
            <ol className="guide-steps">
              <li><span>1</span><div><strong>Set your preferences</strong><p>Choose where and when you want to travel.</p></div></li>
              <li><span>2</span><div><strong>Review matching events</strong><p>We match festivals by destination and dates, then rank them by your interests.</p></div></li>
              <li><span>3</span><div><strong>Check details before travelling</strong><p>Confirm dates, tickets, and visitor information with official sources.</p></div></li>
            </ol>
            <div className="guide-section-label">THE TOURISM 3A CHECKLIST</div>
            <div className="guide-3a-list">
              <article className="guide-3a-card"><span className="guide-3a-icon guide-3a-attraction">✺</span><div><strong>Attractions</strong><p>Discover festivals, traditional performances, and heritage experiences.</p></div></article>
              <article className="guide-3a-card"><span className="guide-3a-icon guide-3a-amenities">⌂</span><div><strong>Amenities</strong><p>Check accommodation, food options, and facilities near places you plan to visit.</p></div></article>
              <article className="guide-3a-card"><span className="guide-3a-icon guide-3a-access">↗</span><div><strong>Accessibility</strong><p>Consider transport options, local routes, and travel times.</p></div></article>
            </div>
            <p className="guide-data-note">Budget is recorded as a preference. Total trip costs are not calculated because transport, accommodation, and meal prices are not yet available.</p>
          </div>
          <button className="sample-itinerary-link" onClick={onShowItinerary}>Preview an illustrative 3-day itinerary <span>→</span></button>
        </aside>
      </div>
      <Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
    </main>
  );
}

const sampleSchedule = [
  [
    { title: "Explore a heritage landmark", kind: "Attraction", description: "An illustrative idea: begin with a cultural site and learn about the region's history.", image: imagePool[6] },
    { title: "Taste local specialities", kind: "Culinary", description: "An illustrative idea: take a lunch break and explore local flavours.", image: imagePool[3] },
    { title: "Visit a traditional arts area", kind: "Culture", description: "An illustrative idea: discover craft, performance, and community traditions.", image: imagePool[1] },
    { title: "Evening cultural experience", kind: "Experience", description: "An illustrative idea: consider an evening activity after checking local schedules.", image: imagePool[0] },
  ],
  [
    { title: "A morning at a local market", kind: "Community", description: "An illustrative idea: explore regional produce and daily life.", image: imagePool[3] },
    { title: "Museum or heritage visit", kind: "Attraction", description: "An illustrative idea: learn more about regional history and craft.", image: imagePool[6] },
    { title: "Workshop or cultural stop", kind: "Culture", description: "An illustrative idea: look for a public workshop or cultural venue.", image: imagePool[1] },
    { title: "Local dinner", kind: "Culinary", description: "An illustrative idea: explore regional cuisine and check opening times.", image: imagePool[7] },
  ],
  [
    { title: "A slower cultural morning", kind: "Culture", description: "An illustrative idea: return to a favourite area or visit a local craft space.", image: imagePool[6] },
    { title: "Lunch and souvenirs", kind: "Culinary", description: "An illustrative idea: find locally made keepsakes and food.", image: imagePool[3] },
    { title: "Flexible time for discoveries", kind: "Explore", description: "An illustrative idea: leave time for an activity found during your stay.", image: imagePool[2] },
  ],
];

function itineraryDestinationLabel(destination: string) {
  if (destination === "all") return "Across Indonesia";
  return destination === "DI Yogyakarta" ? "Yogyakarta, Indonesia" : `${destination}, Indonesia`;
}

function ItineraryPage({
  plan,
  isSaved,
  onSave,
  onRemoveActivity,
  onMoveActivity,
  onAddActivity,
  onPlanner,
  onShowSample,
  onExplore,
  onOpenEvent,
}: {
  plan: ItineraryPlan | null;
  isSaved: boolean;
  onSave: () => boolean;
  onRemoveActivity: (activityId: string) => void;
  onMoveActivity: (activityId: string, direction: "up" | "down") => void;
  onAddActivity: (activity: { date: string; title: string }) => void;
  onPlanner: () => void;
  onShowSample: () => void;
  onExplore: () => void;
  onOpenEvent: (event: FestivalRecord) => void;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const dayDates = plan?.dayDates ?? [];
  const safeActiveDay = Math.min(activeDay, Math.max(dayDates.length - 1, 0));
  const activeDate = dayDates[safeActiveDay];
  const isSample = plan?.mode === "sample";
  const allActivities = plan?.activities ?? [];
  const selectedDayActivities = activeDate ? allActivities.filter((activity) => activity.date === activeDate) : [];
  const selectedSampleActivities = isSample ? (sampleSchedule[safeActiveDay] ?? []) : [];
  const eventByNo = new Map<number, FestivalRecord>((plan?.matches ?? []).map((event) => [event.no, event] as const));

  useEffect(() => {
    setActiveDay(0);
    setEditMode(false);
    setSaveMessage("");
    setShowAddForm(false);
  }, [plan?.createdAt]);

  const handleSave = () => {
    const saved = onSave();
    setSaveMessage(saved ? "Itinerary saved in this browser on this device." : "We could not save the itinerary in this browser. Check your browser storage settings.");
  };

  const handleAddActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeDate || !customTitle.trim()) return;
    onAddActivity({ date: activeDate, title: customTitle.trim() });
    setCustomTitle("");
    setShowAddForm(false);
    setSaveMessage("");
  };

  if (!plan) {
    return (
      <main className="content-page itinerary-page">
        <div className="itinerary-empty-state">
          <span className="itinerary-empty-icon">✦</span>
          <div className="section-kicker">YOUR NEXT JOURNEY</div>
          <h1>Your cultural itinerary</h1>
          <p>You have not created a trip plan yet. Choose a destination and travel dates to find festival listings and flexible cultural activity ideas.</p>
          <div className="itinerary-empty-actions">
            <button className="button button-primary" onClick={onPlanner}>Start planning <span>↗</span></button>
            <button className="button button-secondary" onClick={onShowSample}>Preview a sample itinerary</button>
          </div>
        </div>
        <Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
      </main>
    );
  }

  const preferences = plan.preferences;
  const eventCount = plan.matches.length;
  const isGenerated = plan.mode === "generated";

  return (
    <main className="content-page itinerary-page">
      <button className="back-link" onClick={onPlanner}>← Back to trip planner</button>
      <div className="itinerary-head">
        <div>
          <div className="section-kicker">{isSample ? "SAMPLE TRIP · ILLUSTRATIVE IDEAS" : "YOUR TRIP PLAN · FESTIVAL MATCHES + FLEXIBLE IDEAS"}</div>
          <h1>Your cultural journey</h1>
          <p>{isSample ? "A sample 3-day itinerary layout inspired by Yogyakarta. Places and activities are illustrative and must be checked before travel. This sample is separate from recommendations created with Trip Planner." : eventCount ? `We found ${eventCount} festival ${eventCount === 1 ? "listing" : "listings"} for your destination and dates, then filled the remaining schedule with flexible activity ideas. Activities are shown in suggested order, not fixed appointment times. Confirm all venues and details before travelling.` : "No festival listing matched your destination and dates, so we prepared a flexible day-by-day outline. Add verified places or adjust your trip preferences before travelling."}</p>
        </div>
        <div className="itinerary-head-actions">
          {isSample ? (
            <button className="button button-primary" onClick={onPlanner}>Create your own trip <span>↗</span></button>
          ) : (
            <>
              <button className={`button button-secondary ${editMode ? "button-edit-active" : ""}`} onClick={() => { setEditMode((value) => !value); setSaveMessage(""); setShowAddForm(false); }}>{editMode ? "Done editing" : "✎ Edit itinerary"}</button>
              <button className="button button-primary" onClick={handleSave}>{isSaved ? "Save changes" : "Save itinerary"}</button>
            </>
          )}
        </div>
      </div>
      <div className="itinerary-summary">
        <span>⌖ {itineraryDestinationLabel(preferences.destination)}</span>
        <span>▦ {formatTripDateRange(preferences.startDate, preferences.endDate)}</span>
        <span>♙ {preferences.travelers} {preferences.travelers === 1 ? "traveller" : "travellers"}</span>
        <span>◈ {preferences.budget === "Not sure yet" || preferences.budget === "Not estimated" ? "Budget not estimated" : `${preferences.budget} per person`}</span>
      </div>
      {saveMessage && <p className={`itinerary-save-message ${saveMessage.startsWith("Itinerary saved") ? "is-success" : "is-error"}`} role="status">{saveMessage}</p>}
      {editMode && <div className="itinerary-edit-note">Edit mode: reorder or remove any activity, or add your own activity. Flexible ideas are suggestions, not confirmed venues. Remember to save your changes.</div>}
      <div className="day-tabs">
        {dayDates.map((date, index) => {
          const count = plan.matches.filter((event) => plan.visitDates[String(event.no)] === date).length;
          return <button key={date} className={safeActiveDay === index ? "day-tab-active" : ""} onClick={() => setActiveDay(index)}><strong>Day {index + 1}</strong><small>{formatTripDate(date)}</small>{isGenerated && <small className="day-event-count">{count} {count === 1 ? "festival" : "festivals"}</small>}</button>;
        })}
      </div>
      <div className="itinerary-list">
        {isSample ? selectedSampleActivities.map((activity, index) => (
          <article className="itinerary-activity" key={`${safeActiveDay}-${activity.title}`}>
            <div className="activity-line"><i /></div>
            <div className="activity-image"><img src={activity.image} alt="Illustrative cultural travel idea" loading="lazy" /></div>
            <div className="activity-copy"><span className={`activity-kind kind-${index % 3}`}>{activity.kind}</span><h3>{activity.title}</h3><p>{activity.description}</p><span className="itinerary-illustrative-label">Illustrative idea · Not a confirmed venue</span></div>
            <span className="activity-more" aria-hidden="true">···</span>
          </article>
        )) : selectedDayActivities.length ? selectedDayActivities.map((activity, index) => {
          const event = activity.eventNo ? eventByNo.get(activity.eventNo) : undefined;
          const photo = event ? getEventPhoto(event, index) : { url: imagePool[(index + safeActiveDay) % imagePool.length], illustrative: true };
          const isFestival = activity.source === "festival" && Boolean(event);
          const kindLabel = isFestival ? "Festival listing" : activity.source === "custom" ? "Your activity" : "Flexible idea";
          return (
            <article className="itinerary-activity itinerary-event-activity" key={activity.id}>
              <div className="activity-line"><i /></div>
              <div className="activity-image"><img src={photo.url} alt={isFestival && event ? (photo.illustrative ? `Illustrative photo for ${event.nama_event}` : event.nama_event) : "Illustrative activity"} loading="lazy" /><span className="itinerary-image-label">{isFestival && !photo.illustrative ? "Event photo" : "Illustrative"}</span></div>
              <div className="activity-copy">
                <span className={`activity-kind kind-${index % 3}`}>{kindLabel}</span>
                <h3>{isFestival && event ? event.nama_event : activity.title}</h3>
                <p>{isFestival && event ? (event.deskripsi_festinesia?.trim() || "This event appears in the current working dataset. Check the official source for programme details and visitor information.") : activity.description}</p>
                {isFestival && event && <>
                  {(plan.matchReasons?.[String(event.no)] ?? []).length > 0 && <div className="match-reason-row"><span>Why this matches</span>{(plan.matchReasons?.[String(event.no)] ?? []).map((reason) => <span className="match-reason-chip" key={reason}>{reason}</span>)}</div>}
                  <div className="itinerary-event-meta"><span>▦ {formatDateRange(event)}</span><span>⌖ {locationLabel(event)}</span><span>◈ {priceLabel(event)}</span></div>
                  <div className="itinerary-event-actions"><button onClick={() => onOpenEvent(event)}>View event details ↗</button>{event.url_sumber && <a href={event.url_sumber} target="_blank" rel="noreferrer">Official source ↗</a>}</div>
                </>}
                {!isFestival && <span className="itinerary-illustrative-label">Flexible suggestion · choose and verify a venue</span>}
              </div>
              {editMode ? <div className="activity-edit-actions" aria-label={`Edit ${activity.title}`}>
                <button type="button" onClick={() => onMoveActivity(activity.id, "up")} disabled={index === 0} aria-label="Move activity earlier" title="Move earlier">↑</button>
                <button type="button" onClick={() => onMoveActivity(activity.id, "down")} disabled={index === selectedDayActivities.length - 1} aria-label="Move activity later" title="Move later">↓</button>
                <button type="button" className="itinerary-remove-button" onClick={() => onRemoveActivity(activity.id)} aria-label="Remove activity" title="Remove from itinerary">×</button>
              </div> : <span className="activity-more" aria-hidden="true">···</span>}
            </article>
          );
        }) : <div className="itinerary-day-empty"><span>✦</span><h3>This day is open for your own discoveries</h3><p>No scheduled activity remains for this day. Turn on Edit itinerary to add your own activity, or leave the day flexible.</p></div>}
        {editMode && !isSample && <>
          {!showAddForm ? <button className="button button-secondary itinerary-add-button" onClick={() => setShowAddForm(true)}>＋ Add your own activity</button> : <form className="itinerary-add-form" onSubmit={handleAddActivity}>
            <strong>Add an activity to Day {safeActiveDay + 1}</strong>
            <input aria-label="Activity name" placeholder="e.g. Visit a local art market" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} required maxLength={90}/>
            <div><button className="button button-primary" type="submit">Add activity</button><button className="button button-secondary" type="button" onClick={() => setShowAddForm(false)}>Cancel</button></div>
          </form>}
        </>}
      </div>
      <div className="sample-disclaimer"><span>ⓘ</span><p>{isSample ? "This is an illustrative sample, not a confirmed travel plan. Places and activities are examples only; no visit times are assigned." : "Festival listings are matched from the working dataset. Other schedule entries are flexible activity ideas, not verified venues or bookings. Festival programme times, opening hours, transport, and total trip costs must be checked before travelling."}</p></div>
      <Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
    </main>
  );
}

function DestinationsPage({ onComingSoon }: { onComingSoon: (feature: string) => void }) {
  return <main className="content-page destinations-page"><div className="page-intro"><div className="section-kicker">EXPLORE THE ARCHIPELAGO</div><h1>Destinations with stories</h1><p>Start with places where traditions, local creativity, and landscapes come together.</p></div><div className="destination-feature"><img src={imagePool[0]} alt="Illustrative Indonesian destination landscape"/><div className="destination-feature-shade"/><div className="destination-feature-copy"><span className="eyebrow">CULTURE IS EVERYWHERE</span><h2>One country.<br/><em>Many worlds.</em></h2><p>Explore Indonesia one region at a time, then discover events that may bring you closer to local life.</p><button className="button button-light" onClick={() => onComingSoon("Destination detail guides")}>Explore destination guide ↗</button></div></div><div className="section-head destination-section-head"><div><div className="section-kicker">YOUR NEXT STOP</div><h2>Explore by destination</h2><p>These are destination previews. Detailed amenities and map information are coming soon.</p></div></div><div className="destination-grid">{destinations.map((d) => <article className="destination-card" key={d.name}><button className="destination-photo" onClick={() => onComingSoon(`${d.name} destination guide`)}><img src={d.image} alt={`Illustrative photo representing ${d.name}`} loading="lazy"/><span>{d.tag}</span></button><div className="destination-card-body"><h3>{d.name}</h3><small>{displayProvinceName(d.province)}</small><p>{d.description}</p><div className="destination-bottom"><span>{festivals.filter((f) => f.provinsi === d.province).length} dataset listings in region</span><button onClick={() => onComingSoon(`${d.name} destination guide`)}>View guide ↗</button></div></div></article>)}</div><div className="dataset-disclaimer"><span>ⓘ</span><p><strong>Destination guide roadmap.</strong> Maps, nearby hotels, restaurants, and visitor facilities are planned for a future version. No live accommodation or opening-hour data is connected yet.</p></div><Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} /></main>;
}

function Footer({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <footer className="site-footer-v3"><div className="footer-top"><div className="footer-brand-block"><img className="footer-logo" src="/images/FestiNesia_Logo_Horizontal.png" alt="FestiNesia — Culture, closer than ever" /><p>Discover the living culture of Indonesia.</p></div><div className="footer-nav"><button onClick={() => onNavigate("explore")}>Explore festivals</button><button onClick={() => onNavigate("planner")}>Trip Planner</button><button onClick={() => onNavigate("itinerary")}>Itinerary</button><button onClick={() => onNavigate("destinations")}>Destinations</button></div></div><div className="footer-bottom-v3"><span>© 2026 FestiNesia · Student prototype</span><span>Event details can change. Confirm with official sources before travelling.</span></div></footer>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [selectedEvent, setSelectedEvent] = useState<FestivalRecord | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savedEventsLoaded, setSavedEventsLoaded] = useState(false);
  const [queryForExplore, setQueryForExplore] = useState("");
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [itineraryPlan, setItineraryPlan] = useState<ItineraryPlan | null>(null);
  const [itinerarySaved, setItinerarySaved] = useState(false);
  const [savedPlanLoaded, setSavedPlanLoaded] = useState(false);
  const historyInitialized = useRef(false);
  const skipNextHistoryPush = useRef(false);

  // Keep saved festival selections on this browser and device between visits.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("festinesia:saved-events");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedIds(new Set(parsed.filter((value): value is number => Number.isInteger(value))));
      }
    } catch {
      // Ignore invalid or unavailable browser storage.
    }
    setSavedEventsLoaded(true);
  }, []);

  useEffect(() => {
    if (!savedEventsLoaded) return;
    try {
      window.localStorage.setItem("festinesia:saved-events", JSON.stringify([...savedIds]));
    } catch {
      // Saved events remain available for the current session if storage is unavailable.
    }
  }, [savedIds, savedEventsLoaded]);

  // Keep in-app view changes in browser history so the phone/browser Back button
  // returns to the previous FestiNesia screen instead of leaving the site immediately.
  useEffect(() => {
    const appState = {
      view,
      eventNo: view === "event" ? selectedEvent?.no ?? null : null,
      query: queryForExplore,
    };

    if (!historyInitialized.current) {
      window.history.replaceState(
        { ...(window.history.state ?? {}), festinesia: appState },
        "",
        window.location.href,
      );
      historyInitialized.current = true;
      return;
    }

    if (skipNextHistoryPush.current) {
      skipNextHistoryPush.current = false;
      return;
    }

    window.history.pushState(
      { ...(window.history.state ?? {}), festinesia: appState },
      "",
      window.location.href,
    );
  }, [view, selectedEvent?.no, queryForExplore]);

  useEffect(() => {
    const handleBrowserBack = (event: PopStateEvent) => {
      const appState = event.state?.festinesia as
        | { view?: View; eventNo?: number | null; query?: string }
        | undefined;
      skipNextHistoryPush.current = true;

      if (appState?.view && ["home", "explore", "event", "planner", "itinerary", "destinations"].includes(appState.view)) {
        setView(appState.view);
        setSelectedEvent(
          appState.view === "event" && appState.eventNo != null
            ? festivals.find((item) => item.no === appState.eventNo) ?? null
            : null,
        );
        setQueryForExplore(typeof appState.query === "string" ? appState.query : "");
      } else {
        setView("home");
        setSelectedEvent(null);
        setQueryForExplore("");
      }

      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ITINERARY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ItineraryPlan;
        if (parsed?.preferences && Array.isArray(parsed.matches) && Array.isArray(parsed.dayDates) && parsed.visitDates) {
          setItineraryPlan(ensurePlanActivities(parsed));
          setItinerarySaved(true);
        }
      }
    } catch {
      // Ignore unreadable browser storage and let the user create a fresh plan.
    }
    setSavedPlanLoaded(true);
  }, []);

  const navigate = (target: View) => {
    if (target === "event" && !selectedEvent) target = "explore";
    setView(target);
    setMobileMenuOpen(false);
    if (target !== "event") setSelectedEvent(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openEvent = (event: FestivalRecord) => { setSelectedEvent(event); setView("event"); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleFavorite = (event: FestivalRecord) => setSavedIds((old) => { const next = new Set(old); if (next.has(event.no)) next.delete(event.no); else next.add(event.no); return next; });
  const exploreSearch = (query: string) => { setQueryForExplore(query); setView("explore"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const showComingSoon = (feature: string) => setComingSoonFeature(feature);

  const handleCreateTripPlan = (preferences: TripPreferences) => {
    try {
      const nextPlan = createTripPlan(preferences);
      setItineraryPlan(nextPlan);
      setItinerarySaved(false);
      try { window.localStorage.removeItem(ITINERARY_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
      navigate("itinerary");
    } catch {
      setComingSoonFeature("Your trip dates could not be used to create an itinerary");
    }
  };

  const handleShowSamplePlan = () => {
    setItineraryPlan(createSamplePlan());
    setItinerarySaved(false);
    navigate("itinerary");
  };

  const handleSaveItinerary = () => {
    if (!itineraryPlan) return false;
    try {
      window.localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify(itineraryPlan));
      setItinerarySaved(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleRemoveItineraryActivity = (activityId: string) => {
    setItineraryPlan((current) => {
      if (!current) return current;
      const removed = current.activities?.find((activity) => activity.id === activityId);
      const nextActivities = (current.activities ?? []).filter((activity) => activity.id !== activityId);
      if (removed?.eventNo) {
        return {
          ...current,
          activities: nextActivities,
          matches: current.matches.filter((event) => event.no !== removed.eventNo),
          visitDates: Object.fromEntries(Object.entries(current.visitDates).filter(([key]) => Number(key) !== removed.eventNo)),
          removedEventNos: [...(current.removedEventNos ?? []), removed.eventNo],
        };
      }
      return { ...current, activities: nextActivities };
    });
    setItinerarySaved(false);
    try { window.localStorage.removeItem(ITINERARY_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  };

  const handleMoveItineraryActivity = (activityId: string, direction: "up" | "down") => {
    setItineraryPlan((current) => {
      if (!current?.activities) return current;
      const activity = current.activities.find((item) => item.id === activityId);
      if (!activity) return current;
      const dayActivities = current.activities.filter((item) => item.date === activity.date);
      const index = dayActivities.findIndex((item) => item.id === activityId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= dayActivities.length) return current;
      const first = current.activities.findIndex((item) => item.id === dayActivities[index].id);
      const second = current.activities.findIndex((item) => item.id === dayActivities[target].id);
      const next = [...current.activities];
      [next[first], next[second]] = [next[second], next[first]];
      return { ...current, activities: next };
    });
    setItinerarySaved(false);
    try { window.localStorage.removeItem(ITINERARY_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  };

  const handleAddItineraryActivity = (activity: { date: string; title: string }) => {
    setItineraryPlan((current) => current ? {
      ...current,
      activities: [...(current.activities ?? []), {
        id: `custom-${Date.now()}`,
        date: activity.date,
        title: activity.title,
        description: "Added by you. Confirm the venue, opening hours, and travel details before your visit.",
        kind: "Your activity",
        source: "custom",
      }],
    } : current);
    setItinerarySaved(false);
    try { window.localStorage.removeItem(ITINERARY_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  };

  useEffect(() => {
    const handleFooterNavigation = (event: Event) => {
      const target = (event as CustomEvent<View>).detail;
      if (["home", "explore", "planner", "itinerary", "destinations"].includes(target)) {
        setView(target);
        setSelectedEvent(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("festinesia:navigate", handleFooterNavigation);
    return () => window.removeEventListener("festinesia:navigate", handleFooterNavigation);
  }, []);

  return <>
    <header className="site-header-v3"><div className="header-inner"><Brand onClick={() => navigate("home")} /><button className={`mobile-menu-button ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Toggle menu">{mobileMenuOpen ? "×" : "☰"}</button><nav className={`main-nav ${mobileMenuOpen ? "mobile-nav-open" : ""}`} aria-label="Main navigation">{([{ key: "home", label: "Home" }, { key: "explore", label: "Explore" }, { key: "planner", label: "Trip Planner" }, { key: "itinerary", label: "Itinerary" }, { key: "destinations", label: "Destinations" }] as { key: View; label: string }[]).map((item) => <button key={item.label} className={(view === item.key || (item.key === "explore" && view === "event")) ? "nav-active-v3" : ""} onClick={() => navigate(item.key)}>{item.label}</button>)}</nav></div></header>
    {view === "home" && <HomeLanding onNavigate={navigate} onExploreSearch={exploreSearch} onOpenEvent={openEvent} favorites={savedIds} onToggleFavorite={toggleFavorite} onComingSoon={showComingSoon} />}
    {view === "explore" && <ExplorePage key={queryForExplore} onOpenEvent={openEvent} favorites={savedIds} onToggleFavorite={toggleFavorite} initialQuery={queryForExplore} />}
    {view === "event" && selectedEvent && <DetailPage event={selectedEvent} onBack={() => navigate("explore")} onComingSoon={showComingSoon} favorite={savedIds.has(selectedEvent.no)} onFavorite={() => toggleFavorite(selectedEvent)} />}
    {view === "planner" && <PlannerPage initialPreferences={itineraryPlan?.preferences} onCreatePlan={handleCreateTripPlan} onShowItinerary={handleShowSamplePlan} />}
    {view === "itinerary" && savedPlanLoaded && <ItineraryPage plan={itineraryPlan} isSaved={itinerarySaved} onSave={handleSaveItinerary} onRemoveActivity={handleRemoveItineraryActivity} onMoveActivity={handleMoveItineraryActivity} onAddActivity={handleAddItineraryActivity} onPlanner={() => navigate("planner")} onShowSample={handleShowSamplePlan} onExplore={() => navigate("explore")} onOpenEvent={openEvent} />}
    {view === "destinations" && <DestinationsPage onComingSoon={showComingSoon} />}
    {comingSoonFeature && <ComingSoonModal feature={comingSoonFeature} onClose={() => setComingSoonFeature(null)} />}
  </>;
}
