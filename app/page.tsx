"use client";

import { useEffect, useMemo, useState } from "react";
import {
  eventStatus,
  festivals,
  formatDateRange,
  priceLabel,
  type FestivalRecord,
} from "@/lib/festivals";
import { getEventImage } from "@/lib/event-images";

type View = "home" | "explore" | "event" | "planner" | "itinerary" | "destinations";
type Category = "All" | "Festivals" | "Performances" | "Museums" | "Culinary" | "Traditions" | "Village tourism";
type DetailTab = "Overview" | "Attraction" | "Amenities" | "Accessibility" | "Travel tips" | "Reviews";
type Timing = "all" | "upcoming" | "ongoing" | "past";

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

function locationLabel(event: FestivalRecord) {
  return [event.kabupaten_kota, event.provinsi].filter(Boolean).join(", ") || "Indonesia";
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
      <span className="brand-mark"><span>F</span></span>
      <span className="brand-copy"><span className="brand-word">Festi<span>Nesia</span></span><small>Culture, closer than ever</small></span>
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
          <div className="event-facts"><div className="fact-card"><span className="fact-icon peach">✺</span><small>Event type</small><strong>Culture & festival</strong></div><div className="fact-card"><span className="fact-icon blue">⌖</span><small>Location</small><strong>{event.kabupaten_kota || event.provinsi || "Indonesia"}</strong></div><div className="fact-card"><span className="fact-icon mint">▦</span><small>Event dates</small><strong>{formatDateRange(event)}</strong></div><div className="fact-card"><span className="fact-icon coral">Rp</span><small>Ticket information</small><strong>{priceLabel(event)}</strong></div></div></section>
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
  const links = [
    event.url_sumber ? { label: "Open KEN catalogue", url: event.url_sumber } : null,
    event.harga_sumber ? { label: "Open event information", url: event.harga_sumber } : null,
    event.instagram ? { label: "Instagram profile", url: `https://www.instagram.com/${event.instagram.replace(/^@/, "")}/` } : null,
  ].filter((item): item is { label: string; url: string } => Boolean(item && /^https?:\/\//.test(item.url)));
  return <section className="source-panel"><div className="source-symbol">ⓘ</div><div className="source-copy"><strong>Before you go</strong><p>Dates and event details come from the working KEN 2026 dataset and may change. Confirm current details with the organiser or official source before travelling.</p><small>Dataset source: {event.sumber || "Source not specified"}{event.harga_dicek ? ` · Price checked ${event.harga_dicek}` : ""}</small></div><div className="source-links">{links.length ? links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>) : <span>Direct source link unavailable</span>}</div></section>;
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
  const popular = [...festivals].sort((a, b) => Number(b.top_10_ken === "Ya") - Number(a.top_10_ken === "Ya")).slice(0, 4);
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
          <div className="hero-trust-line"><span>✦</span> Public event references <i /> Cultural discovery <i /> Trip inspiration</div>
        </div>
        <div className="hero-vertical-note">THE ARCHIPELAGO, ONE STORY AT A TIME</div>
        <div className="hero-caption"><span /> A journey into local culture</div>
      </section>
      <section className="stats-bar"><div className="stat-cell"><span className="stat-icon stat-green">✺</span><div><strong>{festivals.length}</strong><small>Festival listings</small></div></div><span className="stat-separator" /><div className="stat-cell"><span className="stat-icon stat-orange">◷</span><div><strong>{upcomingCount}</strong><small>Upcoming or ongoing*</small></div></div><span className="stat-separator" /><div className="stat-cell"><span className="stat-icon stat-blue">⌖</span><div><strong>{provinceCount}</strong><small>Provinces represented</small></div></div><p className="stats-note">*Calculated from dates in the<br />working dataset.</p></section>
      <section className="home-feature-row page-width"><button className="home-feature" onClick={() => onNavigate("explore")}><span className="feature-icon icon-orange">▣</span><strong>Festivals & events</strong><small>Discover cultural celebrations across Indonesia.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onNavigate("destinations")}><span className="feature-icon icon-blue">⌖</span><strong>Cultural destinations</strong><small>Explore regions known for living traditions.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onNavigate("planner")}><span className="feature-icon icon-purple">✧</span><strong>Trip planner</strong><small>Personalised itinerary planning is coming soon.</small><span className="feature-arrow">↗</span></button><button className="home-feature" onClick={() => onComingSoon("Complete 3A destination guides")}><span className="feature-icon icon-green">▤</span><strong>3A information</strong><small>Attractions, amenities, and accessibility.</small><span className="feature-arrow">↗</span></button></section>
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
  const [topOnly, setTopOnly] = useState(false);
  const [budget, setBudget] = useState("all");
  const [visible, setVisible] = useState(12);
  const categories: Category[] = ["All", "Festivals", "Performances", "Museums", "Culinary", "Traditions", "Village tourism"];
  const results = useMemo(() => festivals.filter((event) => {
    const haystack = [event.nama_event, event.provinsi, event.kabupaten_kota, event.akses_transportasi].filter(Boolean).join(" ").toLowerCase();
    const status = eventStatus(event);
    const min = event.harga_min_rp;
    const queryMatch = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const provinceMatch = province === "all" || event.provinsi === province;
    const timeMatch = timing === "all" || status === timing;
    const topMatch = !topOnly || event.top_10_ken?.toLowerCase() === "ya";
    const budgetMatch = budget === "all" || (budget === "free" ? (min === 0 || /gratis|free/i.test(event.harga_status || "")) : budget === "under500" ? (typeof min === "number" && min > 0 && min < 500000) : budget === "under1m" ? (typeof min === "number" && min <= 1000000) : true);
    return queryMatch && provinceMatch && timeMatch && topMatch && categoryMatch(event, category) && budgetMatch;
  }).sort((a, b) => {
    const rank = (e: FestivalRecord) => eventStatus(e) === "upcoming" ? 0 : eventStatus(e) === "ongoing" ? 1 : eventStatus(e) === "unknown" ? 2 : 3;
    return rank(a) - rank(b) || a.nama_event.localeCompare(b.nama_event, "en");
  }), [query, province, timing, topOnly, category, budget]);
  const clear = () => { setQuery(""); setProvince("all"); setTiming("all"); setTopOnly(false); setCategory("All"); setBudget("all"); setVisible(12); };
  return <main className="content-page explore-page"><div className="page-intro"><div className="section-kicker">FIND YOUR NEXT CULTURAL EXPERIENCE</div><h1>Explore festivals & culture</h1><p>Discover events across Indonesia, from regional celebrations to living traditions.</p></div>
    <div className="explore-search-row"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setVisible(12); }} placeholder="Search a festival, destination, or city..." aria-label="Search event listings" /><kbd>/</kbd><span className="search-results-total">{results.length} listings</span></div>
    <div className="category-scroll">{categories.map((item) => <button key={item} onClick={() => { setCategory(item); setVisible(12); }} className={`category-chip ${category === item ? "category-active" : ""}`}>{item}</button>)}</div>
    <div className="explore-layout"><aside className="filters-sidebar"><div className="filters-heading"><strong>Filters</strong><button onClick={clear}>Reset</button></div><label className="filter-group"><span>Location</span><select value={province} onChange={(e) => setProvince(e.target.value)}><option value="all">All provinces</option>{provinces.map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label className="filter-group"><span>When</span><select value={timing} onChange={(e) => setTiming(e.target.value as Timing)}><option value="all">Any time</option><option value="upcoming">Upcoming</option><option value="ongoing">Happening now</option><option value="past">Past events</option></select></label><div className="filter-group"><span>Budget guidance</span><label className="radio-line"><input type="radio" name="budget" checked={budget === "all"} onChange={() => setBudget("all")} /> Any budget</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "free"} onChange={() => setBudget("free")} /> Free entry listed</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "under500"} onChange={() => setBudget("under500")} /> Under Rp500,000</label><label className="radio-line"><input type="radio" name="budget" checked={budget === "under1m"} onChange={() => setBudget("under1m")} /> Up to Rp1,000,000</label></div><button className={`top-filter-sidebar ${topOnly ? "selected" : ""}`} onClick={() => setTopOnly((v) => !v)}><span>✦</span><span><strong>KEN Top 10</strong><small>Highlight selected KEN listings</small></span><span className="toggle-track"><i /></span></button><div className="filter-help"><span>ⓘ</span><p>Filters use the current working dataset. Event schedules should be checked with official sources.</p></div></aside>
      <section className="results-main"><div className="results-heading"><div><h2>{category === "All" ? "Cultural events" : category}</h2><p>Showing {Math.min(visible, results.length)} of {results.length} listings</p></div><label className="sort-select">Sort by <select defaultValue="relevant"><option value="relevant">Recommended</option><option value="name">Name A–Z</option></select></label></div>
      {results.length ? <div className="event-grid-explore">{results.slice(0, visible).map((event) => <EventCard key={event.no} event={event} onOpen={onOpenEvent} isFavorite={favorites.has(event.no)} onToggleFavorite={onToggleFavorite} />)}</div> : <div className="empty-results"><span>⌕</span><h3>No matches found</h3><p>Try removing a filter or searching for another location.</p><button className="button button-primary" onClick={clear}>Clear all filters</button></div>}
      {visible < results.length && <button className="button button-secondary show-more" onClick={() => setVisible((v) => v + 12)}>Load more events ↓</button>}
      <div className="dataset-disclaimer"><span>ⓘ</span><p><strong>A note on event data.</strong> This prototype contains 125 listings from the KEN 2026 working dataset. Dates, prices, and visitor details may have changed and are not live-verified.</p></div>
      </section></div><Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
  </main>;
}

function PlannerPage({ onComingSoon, onShowItinerary }: { onComingSoon: (feature: string) => void; onShowItinerary: () => void }) {
  const [province, setProvince] = useState("Yogyakarta");
  const [startDate, setStartDate] = useState("2026-11-10");
  const [endDate, setEndDate] = useState("2026-11-12");
  const [budget, setBudget] = useState("Rp1,000,000 – 2,000,000");
  const [travelers, setTravelers] = useState(2);
  const [interest, setInterest] = useState<string[]>(["Festivals", "Traditional arts", "Culinary"]);
  const interests = ["Festivals", "Traditional arts", "Culinary", "Nature", "Heritage", "Local communities"];
  const toggleInterest = (item: string) => setInterest((old) => old.includes(item) ? old.filter((v) => v !== item) : [...old, item]);

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
            <p>Share your travel preferences to prepare for a journey filled with local culture and meaningful experiences.</p>
          </div>
        </div>
        <span className="coming-badge">ITINERARY BUILDER COMING SOON</span>
      </div>
      <div className="planner-layout">
        <form className="planner-settings" onSubmit={(e) => { e.preventDefault(); onComingSoon("Personalised itinerary planning"); }}>
          <div className="form-card-head">
            <span className="form-head-icon">✧</span>
            <div>
              <h2>Build your trip</h2>
              <p>Choose your preferences to shape a future travel plan.</p>
            </div>
          </div>
          <label className="full-field">
            <span>Where would you like to go?</span>
            <select value={province} onChange={(e) => setProvince(e.target.value)}>
              <option>Yogyakarta</option><option>Bali</option><option>Sumatera Utara</option><option>Jawa Timur</option><option>Aceh</option><option>Anywhere in Indonesia</option>
              {provinces.filter((p) => !["Yogyakarta", "Bali", "Sumatera Utara", "Jawa Timur", "Aceh", "Anywhere in Indonesia"].includes(p)).map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <div className="field-two-col">
            <label className="full-field"><span>Start date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <label className="full-field"><span>End date</span><input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          </div>
          <label className="full-field">
            <span>Budget per person</span>
            <select value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option>Under Rp500,000</option><option>Rp500,000 – 1,000,000</option><option>Rp1,000,000 – 2,000,000</option><option>Over Rp2,000,000</option><option>Not sure yet</option>
            </select>
          </label>
          <div className="full-field">
            <span>What are you interested in?</span>
            <div className="interest-chips">{interests.map((item) => <button type="button" key={item} className={interest.includes(item) ? "interest-selected" : ""} onClick={() => toggleInterest(item)}>{interest.includes(item) && <span>✓ </span>}{item}</button>)}</div>
          </div>
          <div className="travelers-field">
            <span>Number of travellers</span>
            <div className="stepper"><button type="button" onClick={() => setTravelers((n) => Math.max(1, n - 1))} aria-label="Remove traveller">−</button><strong>{travelers}</strong><button type="button" onClick={() => setTravelers((n) => Math.min(12, n + 1))} aria-label="Add traveller">+</button></div>
          </div>
          <button className="button button-primary button-wide planner-generate" type="submit">Create My Itinerary <span>↗</span></button>
          <p className="form-note">Personalised recommendations and itinerary generation are coming soon.</p>
        </form>
        <section className="planner-assistant">
          <div className="assistant-top">
            <div className="assistant-avatar">⌖</div>
            <div><strong>Your Travel Guide</strong><small><span className="status-dot" /> Planning resources · Preview</small></div>
            <span className="assistant-more">3A</span>
          </div>
          <div className="assistant-chat">
            <div className="assistant-message">
              <strong>A good trip starts with the right details</strong>
              <p>Use your destination, travel dates, budget, and interests to shape a cultural journey that suits you.</p>
            </div>
            <div className="suggestion-title">THINGS TO CONSIDER</div>
            <div className="suggestions">
              <div className="assistant-message"><strong>Attractions</strong><p>Look for local festivals, traditional performances, and heritage experiences.</p></div>
              <div className="assistant-message"><strong>Amenities</strong><p>Think about accommodation, food options, and facilities near the places you plan to visit.</p></div>
              <div className="assistant-message"><strong>Accessibility</strong><p>Check transport options, local routes, and travel time before setting your itinerary.</p></div>
            </div>
          </div>
          <button className="sample-itinerary-link" onClick={onShowItinerary}>Preview a sample 3-day itinerary <span>→</span></button>
        </section>
      </div>
      <Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} />
    </main>
  );
}

function ItineraryPage({ onComingSoon, onPlanner }: { onComingSoon: (feature: string) => void; onPlanner: () => void }) {
  const [activeDay, setActiveDay] = useState(0);
  const days = [
    { label: "Day 1", date: "10 Nov", activities: [{ time: "09:00", title: "Explore a heritage landmark", kind: "Attraction", description: "Begin with a cultural site and learn about the region's history.", image: imagePool[6] }, { time: "12:00", title: "Taste local specialities", kind: "Culinary", description: "Take a lunch break and explore local flavours.", image: imagePool[3] }, { time: "15:00", title: "Visit a traditional arts area", kind: "Culture", description: "Discover craft, performance, and community traditions.", image: imagePool[1] }, { time: "18:30", title: "Evening cultural experience", kind: "Experience", description: "End the day with an activity after checking local schedules.", image: imagePool[0] }] },
    { label: "Day 2", date: "11 Nov", activities: [{ time: "08:30", title: "A morning at a local market", kind: "Community", description: "Explore regional produce and daily life.", image: imagePool[3] }, { time: "11:00", title: "Museum or heritage visit", kind: "Attraction", description: "Learn more about regional history and craft.", image: imagePool[6] }, { time: "14:00", title: "Workshop or cultural stop", kind: "Culture", description: "Look for a public workshop or cultural venue.", image: imagePool[1] }, { time: "19:00", title: "Local dinner", kind: "Culinary", description: "Explore regional cuisine and check opening times.", image: imagePool[7] }] },
    { label: "Day 3", date: "12 Nov", activities: [{ time: "09:00", title: "A slower cultural morning", kind: "Culture", description: "Return to a favourite area or visit a local craft space.", image: imagePool[6] }, { time: "12:00", title: "Lunch and souvenirs", kind: "Culinary", description: "Find locally made keepsakes and food.", image: imagePool[3] }, { time: "15:00", title: "Flexible time for discoveries", kind: "Explore", description: "Use this time for an activity found during your stay.", image: imagePool[2] }] },
  ];
  return <main className="content-page itinerary-page"><button className="back-link" onClick={onPlanner}>← Back to trip planner</button><div className="itinerary-head"><div><div className="section-kicker">SAMPLE TRIP · NOT A CONFIRMED ITINERARY</div><h1>Your cultural journey</h1><p>A sample 3-day itinerary layout inspired by Yogyakarta. Stops and times are illustrative and must be checked before travel.</p></div><div className="itinerary-head-actions"><button className="button button-secondary" onClick={() => onComingSoon("Itinerary editing")}>✎ Edit itinerary</button><button className="button button-primary" onClick={() => onComingSoon("Saving and sharing itineraries")}>Save itinerary</button></div></div><div className="itinerary-summary"><span>⌖ Yogyakarta, Indonesia</span><span>▦ 10–12 November · Sample dates</span><span>♙ 2 travellers</span><span>◈ Budget not estimated</span></div><div className="day-tabs">{days.map((day, i) => <button key={day.label} className={activeDay === i ? "day-tab-active" : ""} onClick={() => setActiveDay(i)}><strong>{day.label}</strong><small>{day.date}</small></button>)}</div><div className="itinerary-list">{days[activeDay].activities.map((activity, i) => <article className="itinerary-activity" key={`${activity.time}-${activity.title}`}><div className="activity-time">{activity.time}<span /></div><div className="activity-line"><i /></div><div className="activity-image"><img src={activity.image} alt="Illustrative activity photo" loading="lazy" /></div><div className="activity-copy"><span className={`activity-kind kind-${i % 3}`}>{activity.kind}</span><h3>{activity.title}</h3><p>{activity.description}</p></div><button className="activity-more" onClick={() => onComingSoon("Detailed itinerary stops")} aria-label="More activity details">···</button></article>)}</div><div className="sample-disclaimer"><span>ⓘ</span><p>This is a sample itinerary layout, not a personalised recommendation or a verified travel plan. Check event dates, opening hours, transport, and local guidance before visiting.</p></div></main>;
}

function DestinationsPage({ onComingSoon }: { onComingSoon: (feature: string) => void }) {
  return <main className="content-page destinations-page"><div className="page-intro"><div className="section-kicker">EXPLORE THE ARCHIPELAGO</div><h1>Destinations with stories</h1><p>Start with places where traditions, local creativity, and landscapes come together.</p></div><div className="destination-feature"><img src={imagePool[0]} alt="Illustrative Indonesian destination landscape"/><div className="destination-feature-shade"/><div className="destination-feature-copy"><span className="eyebrow">CULTURE IS EVERYWHERE</span><h2>One country.<br/><em>Many worlds.</em></h2><p>Explore Indonesia one region at a time, then discover events that may bring you closer to local life.</p><button className="button button-light" onClick={() => onComingSoon("Destination detail guides")}>Explore destination guide ↗</button></div></div><div className="section-head destination-section-head"><div><div className="section-kicker">YOUR NEXT STOP</div><h2>Explore by destination</h2><p>These are destination previews. Detailed amenities and map information are coming soon.</p></div></div><div className="destination-grid">{destinations.map((d) => <article className="destination-card" key={d.name}><button className="destination-photo" onClick={() => onComingSoon(`${d.name} destination guide`)}><img src={d.image} alt={`Illustrative photo representing ${d.name}`} loading="lazy"/><span>{d.tag}</span></button><div className="destination-card-body"><h3>{d.name}</h3><small>{d.province}</small><p>{d.description}</p><div className="destination-bottom"><span>{festivals.filter((f) => f.provinsi === d.province).length} dataset listings in region</span><button onClick={() => onComingSoon(`${d.name} destination guide`)}>View guide ↗</button></div></div></article>)}</div><div className="dataset-disclaimer"><span>ⓘ</span><p><strong>Destination guide roadmap.</strong> Maps, nearby hotels, restaurants, and visitor facilities are planned for a future version. No live accommodation or opening-hour data is connected yet.</p></div><Footer onNavigate={(v) => window.dispatchEvent(new CustomEvent("festinesia:navigate", { detail: v }))} /></main>;
}

function Footer({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <footer className="site-footer-v3"><div className="footer-top"><div><div className="footer-brand-name">Festi<span>Nesia</span></div><p>Discover the living culture of Indonesia.</p></div><div className="footer-nav"><button onClick={() => onNavigate("explore")}>Explore events</button><button onClick={() => onNavigate("planner")}>Trip Planner</button><button onClick={() => onNavigate("destinations")}>Destinations</button></div></div><div className="footer-bottom-v3"><span>© 2026 FestiNesia · Student prototype</span><span>Event details can change. Confirm with official sources before travelling.</span></div></footer>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [selectedEvent, setSelectedEvent] = useState<FestivalRecord | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [queryForExplore, setQueryForExplore] = useState("");
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="site-header-v3"><div className="header-inner"><Brand onClick={() => navigate("home")} /><button className={`mobile-menu-button ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Toggle menu">{mobileMenuOpen ? "×" : "☰"}</button><nav className={`main-nav ${mobileMenuOpen ? "mobile-nav-open" : ""}`} aria-label="Main navigation">{([{ key: "home", label: "Home" }, { key: "explore", label: "Explore" }, { key: "planner", label: "Trip Planner" }, { key: "explore", label: "Events" }, { key: "destinations", label: "Destinations" }] as { key: View; label: string }[]).map((item, i) => <button key={`${item.label}-${i}`} className={(view === item.key && (item.label !== "Events")) || (item.label === "Events" && view === "event") ? "nav-active-v3" : ""} onClick={() => item.label === "Events" ? navigate("explore") : navigate(item.key)}>{item.label}</button>)}</nav><button className="header-search-icon" onClick={() => navigate("explore")} aria-label="Search festivals">⌕</button><button className="header-avatar" onClick={() => showComingSoon("Traveller profile and saved collections")} aria-label="Traveller profile">✦</button><button className="header-cta-v3" onClick={() => navigate("explore")}>Explore festivals <span>↗</span></button></div></header>
    {view === "home" && <HomeLanding onNavigate={navigate} onExploreSearch={exploreSearch} onOpenEvent={openEvent} favorites={savedIds} onToggleFavorite={toggleFavorite} onComingSoon={showComingSoon} />}
    {view === "explore" && <ExplorePage key={queryForExplore} onOpenEvent={openEvent} favorites={savedIds} onToggleFavorite={toggleFavorite} initialQuery={queryForExplore} />}
    {view === "event" && selectedEvent && <DetailPage event={selectedEvent} onBack={() => navigate("explore")} onComingSoon={showComingSoon} favorite={savedIds.has(selectedEvent.no)} onFavorite={() => toggleFavorite(selectedEvent)} />}
    {view === "planner" && <PlannerPage onComingSoon={showComingSoon} onShowItinerary={() => navigate("itinerary")} />}
    {view === "itinerary" && <ItineraryPage onComingSoon={showComingSoon} onPlanner={() => navigate("planner")} />}
    {view === "destinations" && <DestinationsPage onComingSoon={showComingSoon} />}
    {comingSoonFeature && <ComingSoonModal feature={comingSoonFeature} onClose={() => setComingSoonFeature(null)} />}
  </>;
}
