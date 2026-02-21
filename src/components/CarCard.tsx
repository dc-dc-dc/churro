export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  rating: number;
  reviewCount: number;
  type: string;
  seats: number;
  range: string;
  location: string;
  features: string[];
}

// Subtle brand-tinted dark gradients — no external image deps
const BRAND_GRADIENTS: Record<string, string> = {
  Tesla:           "linear-gradient(145deg, #1a0808 0%, #2d0f0f 40%, #0f0505 100%)",
  Porsche:         "linear-gradient(145deg, #12100a 0%, #2d2410 40%, #0f0c06 100%)",
  "Mercedes-Benz": "linear-gradient(145deg, #0a0a0a 0%, #1e1e1e 40%, #0a0a0a 100%)",
  BMW:             "linear-gradient(145deg, #060a14 0%, #0d1f3d 40%, #060a14 100%)",
  Rivian:          "linear-gradient(145deg, #060f0a 0%, #0d2418 40%, #060f0a 100%)",
  Lamborghini:     "linear-gradient(145deg, #111006 0%, #2a2808 40%, #111006 100%)",
};

const DEFAULT_GRADIENT = "linear-gradient(145deg, #0d1120 0%, #1a2038 40%, #0d1120 100%)";

interface CarCardProps {
  car: Car;
  onInteract?: (car: Car) => void;
}

export function CarCard({ car, onInteract }: CarCardProps) {
  const gradient = BRAND_GRADIENTS[car.make] ?? DEFAULT_GRADIENT;

  return (
    <div className="car-card" onClick={() => onInteract?.(car)} style={{ cursor: onInteract ? "pointer" : undefined }}>
      {/* Hero gradient panel */}
      <div className="car-image-wrapper">
        <div
          className="car-image-gradient"
          style={{ background: gradient }}
        >
          <span className="car-model-overlay">
            {car.make} {car.model}
          </span>
        </div>
        <div className="car-image-fade" />
        <span className="car-type-badge">{car.type}</span>
      </div>

      {/* Card body */}
      <div className="car-content">
        <div className="car-body">
          <div className="car-header">
            <div className="car-name-group">
              <span className="car-year">{car.year}</span>
              <h4 className="car-name">
                {car.make} {car.model}
              </h4>
            </div>
            <div className="car-price-group">
              <span className="car-price">${car.pricePerDay}</span>
              <span className="car-price-unit">/day</span>
            </div>
          </div>

          <div className="car-meta">
            <span className="car-rating">
              <span className="rating-star">★</span>
              {car.rating.toFixed(2)}
            </span>
            <span className="car-reviews">({car.reviewCount})</span>
            <span className="car-sep">·</span>
            <span className="car-location">{car.location}</span>
          </div>

          <div className="car-specs">
            <span className="car-spec">
              <span className="spec-icon">👤</span>
              {car.seats} seats
            </span>
            <span className="car-spec">
              <span className="spec-icon">⚡</span>
              {car.range}
            </span>
          </div>

          <div className="car-features">
            {car.features.slice(0, 3).map((f) => (
              <span key={f} className="feature-tag">
                {f}
              </span>
            ))}
          </div>
        </div>

        <button
          className="car-book-button"
          onClick={(e) => { e.stopPropagation(); onInteract?.(car); }}
        >
          Book this car
        </button>
      </div>
    </div>
  );
}
