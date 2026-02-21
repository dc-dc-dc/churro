import type { View } from "../App";
import { CarCard, BRAND_GRADIENTS, DEFAULT_GRADIENT, type Car } from "./CarCard";

// ─── Mock data shown in the default state ──────────────────────────────────
const FEATURED_CARS: Car[] = [
  {
    id: "1",
    make: "Tesla",
    model: "Model S Plaid",
    year: 2024,
    pricePerDay: 189,
    rating: 4.97,
    reviewCount: 234,
    type: "Electric",
    seats: 5,
    range: "396 mi",
    location: "San Francisco, CA",
    features: ["Autopilot", "Ludicrous Mode", "Premium Audio"],
  },
  {
    id: "2",
    make: "Porsche",
    model: "911 Carrera",
    year: 2023,
    pricePerDay: 295,
    rating: 4.92,
    reviewCount: 87,
    type: "Sport",
    seats: 4,
    range: "22 MPG",
    location: "Los Angeles, CA",
    features: ["Sport Chrono", "Bose Audio", "PDK Gearbox"],
  },
  {
    id: "3",
    make: "Mercedes-Benz",
    model: "G 63 AMG",
    year: 2024,
    pricePerDay: 350,
    rating: 4.88,
    reviewCount: 156,
    type: "SUV",
    seats: 5,
    range: "15 MPG",
    location: "Miami, FL",
    features: ["AMG Performance", "Panoramic Roof", "Burmester Audio"],
  },
  {
    id: "4",
    make: "BMW",
    model: "M4 Competition",
    year: 2023,
    pricePerDay: 245,
    rating: 4.95,
    reviewCount: 112,
    type: "Sport",
    seats: 4,
    range: "19 MPG",
    location: "Chicago, IL",
    features: ["M Sport Diff", "Carbon Roof", "Harman Kardon"],
  },
];

const SUGGESTED_PROMPTS = [
  { icon: "⚡", text: "Find me something sporty for the weekend" },
  { icon: "🛻", text: "I need a truck in Austin for moving" },
  { icon: "💰", text: "What's available under $100/day?" },
  { icon: "🌊", text: "Best cars for a coastal road trip" },
  { icon: "🤖", text: "Show me the most unique EVs available" },
  { icon: "👨‍👩‍👧‍👦", text: "Family SUV for 6 people in Denver" },
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
        <CarDetailView car={view.data.car as Car} onBack={onBack} onBook={onBook} />
      )}
      {view.type === "map" && <MapView data={view.data} />}
      {view.type === "booking" && <BookingView data={view.data} />}
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
function CarDetailView({ car, onBack, onBook }: { car: Car; onBack: () => void; onBook: (car: Car) => void }) {
  const gradient = BRAND_GRADIENTS[car.make] ?? DEFAULT_GRADIENT;

  return (
    <div className="car-detail-view">
      {/* Nav row */}
      <div className="car-detail-nav">
        <button className="car-detail-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
        <span className="car-type-badge">{car.type}</span>
      </div>

      {/* Hero */}
      <div className="car-detail-hero" style={{ background: gradient }}>
        <div className="car-detail-hero-fade" />
        <div className="car-detail-hero-content">
          <p className="car-detail-hero-eyebrow">{car.year} · {car.location}</p>
          <h2 className="car-detail-hero-title">{car.make} {car.model}</h2>
        </div>
      </div>

      {/* Header — name + price */}
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

      {/* Specs */}
      <div className="car-detail-specs-grid">
        <div className="car-detail-spec-card">
          <span className="car-detail-spec-icon">👤</span>
          <span className="car-detail-spec-label">Seats</span>
          <span className="car-detail-spec-value">{car.seats}</span>
        </div>
        <div className="car-detail-spec-card">
          <span className="car-detail-spec-icon">⚡</span>
          <span className="car-detail-spec-label">Range</span>
          <span className="car-detail-spec-value">{car.range}</span>
        </div>
        <div className="car-detail-spec-card">
          <span className="car-detail-spec-icon">🏎</span>
          <span className="car-detail-spec-label">Type</span>
          <span className="car-detail-spec-value">{car.type}</span>
        </div>
      </div>

      {/* Features */}
      <div className="car-detail-features-section">
        <h4 className="car-detail-section-title">Features</h4>
        <div className="car-features">
          {car.features.map((f) => (
            <span key={f} className="feature-tag feature-tag--detail">{f}</span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button className="car-detail-reserve" onClick={() => onBook(car)}>
        Reserve · ${car.pricePerDay}/day
      </button>
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
function BookingView({ data }: { data?: { location?: string; startDate?: string; endDate?: string } }) {
  return (
    <div className="booking-view">
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
