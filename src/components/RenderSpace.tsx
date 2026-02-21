import type { View } from "../App";
import { CarCard, BRAND_GRADIENTS, DEFAULT_GRADIENT, type Car } from "./CarCard";
import { CarComparison } from "./CarComparison";
import { carInventory } from "../data/inventory";

// ─── Map inventory car → frontend Car shape ─────────────────────────────────
function pseudoRating(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.round((4.75 + (hash % 25) / 100) * 100) / 100;
}
function pseudoReviewCount(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 50 + (hash % 200);
}
function toCard(id: string): Car | undefined {
  const car = carInventory.find((c) => c.id === id);
  if (!car) return undefined;
  return {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    pricePerDay: Math.round(car.dailyRate / 100),
    rating: pseudoRating(car.id),
    reviewCount: pseudoReviewCount(car.id),
    type: car.category,
    seats: car.seats,
    range: car.mileagePolicy,
    location: car.location,
    pickupMethod: car.pickupMethod,
    features: car.features,
    image: car.imageUrl,
    transmission: car.transmission,
    fuelType: car.fuelType,
  };
}

// Curated featured cars — one from each major category
const FEATURED_IDS = [
  "ev-models-01",      // Tesla Model S — electric
  "spt-911-01",        // Porsche 911 — sports
  "lux-rangerover-01", // Range Rover — luxury SUV
  "suv-rav4-01",       // Toyota RAV4 — everyday SUV
  "spt-m4-01",         // BMW M4 — sports sedan
  "trk-f150-01",       // Ford F-150 — truck
];
const FEATURED_CARS: Car[] = FEATURED_IDS.map(toCard).filter(Boolean) as Car[];

const SUGGESTED_PROMPTS = [
  { icon: "⚡", text: "Sporty car in Los Angeles" },
  { icon: "🛻", text: "Truck for moving in New York" },
  { icon: "💰", text: "Under $100/day in Los Angeles" },
  { icon: "🤖", text: "Best EVs in Los Angeles" },
  { icon: "👨‍👩‍👧‍👦", text: "Family SUV for 6 in New York" },
  { icon: "🏎", text: "Luxury car in New York" },
];

// ─── Props ─────────────────────────────────────────────────────────────────
interface RenderSpaceProps {
  view: View;
  onSuggestedPrompt: (prompt: string) => void;
  onCarInteract: (car: Car) => void;
  onBack: () => void;
  onBook: (car: Car) => void;
}

// ─── Root component ────────────────────────────────────────────────────────
export function RenderSpace({ view, onSuggestedPrompt, onCarInteract, onBack, onBook }: RenderSpaceProps) {
  return (
    <main className="render-space">
      {view.type === "empty" && (
        <EmptyView onSuggestedPrompt={onSuggestedPrompt} onCarInteract={onCarInteract} />
      )}
      {view.type === "cars" && (
        <CarsView cars={(view.data?.cars as Car[]) ?? FEATURED_CARS} onCarInteract={onCarInteract} />
      )}
      {view.type === "car_detail" && view.data?.car && (
        <CarDetailView car={view.data.car as Car} onBack={onBack} />
      )}
      {view.type === "comparison" && view.data?.cars?.length > 0 && (
        <CarComparison cars={view.data.cars as Car[]} onBack={onBack} onBook={onBook} />
      )}
      {view.type === "map" && <MapView data={view.data} />}
      {view.type === "booking" && <BookingView data={view.data} onBack={onBack} />}
    </main>
  );
}

// ─── Empty / welcome view ──────────────────────────────────────────────────
function EmptyView({
  onSuggestedPrompt,
  onCarInteract,
}: {
  onSuggestedPrompt: (p: string) => void;
  onCarInteract: (car: Car) => void;
}) {
  return (
    <div className="empty-view">
      <div className="empty-hero">
        <p className="empty-eyebrow">AI-powered car rentals</p>
        <h2 className="empty-title">
          Drive anything.<br />Go anywhere.
        </h2>
        <p className="empty-body">
          Just tell me what you're looking for — no forms, no filters, just a
          conversation.
        </p>
      </div>

      <div className="suggestions-grid">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p.text}
            onClick={() => onSuggestedPrompt(p.text)}
            className="suggestion-chip"
          >
            <span className="suggestion-icon">{p.icon}</span>
            <span>{p.text}</span>
          </button>
        ))}
      </div>

      <div className="featured-section">
        <div className="featured-header">
          <h3 className="featured-title">Featured cars</h3>
          <span className="featured-badge">Curated for you</span>
        </div>
        <div className="cars-grid">
          {FEATURED_CARS.map((car) => (
            <CarCard key={car.id} car={car} onInteract={onCarInteract} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cars list view ────────────────────────────────────────────────────────
function CarsView({ cars, onCarInteract }: { cars: Car[]; onCarInteract: (car: Car) => void }) {
  return (
    <div className="cars-view">
      <div className="view-header">
        <h3 className="view-title">{cars.length} cars found</h3>
      </div>
      <div className="cars-grid">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} onInteract={onCarInteract} />
        ))}
      </div>
    </div>
  );
}

// ─── Car detail view ───────────────────────────────────────────────────────
function CarDetailView({ car, onBack }: { car: Car; onBack: () => void }) {
  const gradient = BRAND_GRADIENTS[car.make] ?? DEFAULT_GRADIENT;

  return (
    <div className="car-detail-layout car-detail-layout--split">
      {/* ── Car info panel ── */}
      <div className="car-detail-view">
        <div className="car-detail-nav">
          <button className="car-detail-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <span className="car-type-badge car-type-badge--inline">{car.type}</span>
        </div>

        <div className="car-detail-hero" style={car.image ? undefined : { background: gradient }}>
          {car.image && (
            <img className="car-detail-hero-img" src={car.image} alt={`${car.make} ${car.model}`} />
          )}
          <div className="car-detail-hero-fade" />
          <div className="car-detail-hero-content">
            <p className="car-detail-hero-eyebrow">{car.year} · {car.location}</p>
            <h2 className="car-detail-hero-title">{car.make} {car.model}</h2>
          </div>
        </div>

        <div className="car-detail-header">
          <div className="car-detail-meta">
            <span className="car-rating"><span className="rating-star">★</span>{car.rating.toFixed(2)}</span>
            <span className="car-sep">·</span>
            <span className="car-reviews">{car.reviewCount} reviews</span>
            <span className="car-sep">·</span>
            <span className="car-location">{car.location}</span>
          </div>
          <div className="car-detail-price-block">
            <span className="car-detail-price">${car.pricePerDay}</span>
            <span className="car-price-unit">/day</span>
          </div>
        </div>

        <div className="car-detail-specs-grid">
          <div className="car-detail-spec-card">
            <span className="car-detail-spec-icon">👤</span>
            <span className="car-detail-spec-label">Seats</span>
            <span className="car-detail-spec-value">{car.seats}</span>
          </div>
          <div className="car-detail-spec-card">
            <span className="car-detail-spec-icon">📍</span>
            <span className="car-detail-spec-label">Mileage</span>
            <span className="car-detail-spec-value">{car.range}</span>
          </div>
          <div className="car-detail-spec-card">
            <span className="car-detail-spec-icon">🏎</span>
            <span className="car-detail-spec-label">Category</span>
            <span className="car-detail-spec-value">{car.type}</span>
          </div>
          {car.transmission && (
            <div className="car-detail-spec-card">
              <span className="car-detail-spec-icon">⚙️</span>
              <span className="car-detail-spec-label">Transmission</span>
              <span className="car-detail-spec-value" style={{ textTransform: "capitalize" }}>{car.transmission}</span>
            </div>
          )}
          {car.fuelType && (
            <div className="car-detail-spec-card">
              <span className="car-detail-spec-icon">⛽</span>
              <span className="car-detail-spec-label">Fuel</span>
              <span className="car-detail-spec-value" style={{ textTransform: "capitalize" }}>{car.fuelType}</span>
            </div>
          )}
          <div className="car-detail-spec-card">
            <span className="car-detail-spec-icon">📅</span>
            <span className="car-detail-spec-label">Year</span>
            <span className="car-detail-spec-value">{car.year}</span>
          </div>
        </div>

        <div className="car-detail-features-section">
          <h4 className="car-detail-section-title">Features</h4>
          <div className="car-features">
            {car.features.map((f) => (
              <span key={f} className="feature-tag feature-tag--detail">{f}</span>
            ))}
          </div>
        </div>

      </div>

      {/* ── Booking panel ── */}
      <div className="car-booking-panel">
        <div className="car-booking-panel-header">
          <div>
            <p className="empty-eyebrow" style={{ marginBottom: 4 }}>{car.make} {car.model}</p>
            <h3 className="booking-title" style={{ marginBottom: 0 }}>Complete your booking</h3>
          </div>
          <span className="car-detail-price">${car.pricePerDay}<span className="car-price-unit">/day</span></span>
        </div>

        <div className="booking-card">
          <div className="booking-section">
            <label className="booking-label">Pickup location</label>
            <input className="booking-input" defaultValue={car.location} placeholder="Enter pickup location" />
          </div>
          <div className="booking-row">
            <div className="booking-section">
              <label className="booking-label">Pickup date</label>
              <input className="booking-input" type="date" />
            </div>
            <div className="booking-section">
              <label className="booking-label">Return date</label>
              <input className="booking-input" type="date" />
            </div>
          </div>
          <div className="booking-section">
            <label className="booking-label">Payment method</label>
            <input className="booking-input" placeholder="Card number" />
          </div>
          <button className="booking-button">Reserve now</button>
        </div>
      </div>
    </div>
  );
}

// ─── Map placeholder view ──────────────────────────────────────────────────
function MapView({ data: _data }: { data: unknown }) {
  return (
    <div className="map-placeholder">
      <div className="map-grid-bg" />
      <div className="map-inner">
        <div className="map-icon">🗺️</div>
        <h3>Map View</h3>
        <p>Interactive map will be rendered here</p>
      </div>
    </div>
  );
}

// ─── Booking form view ─────────────────────────────────────────────────────
function BookingView({ data, onBack }: { data?: { location?: string; startDate?: string; endDate?: string }; onBack: () => void }) {
  return (
    <div className="booking-view">
      <div className="car-detail-nav" style={{ marginBottom: 8 }}>
        <button className="car-detail-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      </div>
      <h3 className="booking-title">Complete your booking</h3>
      <div className="booking-card">
        <div className="booking-section">
          <label className="booking-label">Pickup location</label>
          <input
            className="booking-input"
            defaultValue={data?.location ?? ""}
            placeholder="Enter pickup location"
          />
        </div>
        <div className="booking-row">
          <div className="booking-section">
            <label className="booking-label">Pickup date</label>
            <input
              className="booking-input"
              type="date"
              defaultValue={data?.startDate ?? ""}
            />
          </div>
          <div className="booking-section">
            <label className="booking-label">Return date</label>
            <input
              className="booking-input"
              type="date"
              defaultValue={data?.endDate ?? ""}
            />
          </div>
        </div>
        <div className="booking-section">
          <label className="booking-label">Payment method</label>
          <input className="booking-input" placeholder="Card number" />
        </div>
        <button className="booking-button">Reserve now</button>
      </div>
    </div>
  );
}
