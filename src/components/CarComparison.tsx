import type { ReactNode } from "react";
import { BRAND_GRADIENTS, DEFAULT_GRADIENT, type Car } from "./CarCard";

interface Props {
  cars: Car[];
  onBack: () => void;
  onBook: (car: Car) => void;
}

export function CarComparison({ cars, onBack, onBook }: Props) {
  const lowestPrice = Math.min(...cars.map((c) => c.pricePerDay));
  const highestSeats = Math.max(...cars.map((c) => c.seats));
  const highestRating = Math.max(...cars.map((c) => c.rating));

  // A feature is "unique" if at least one other car in the comparison doesn't have it
  const isUnique = (feature: string, car: Car) =>
    !cars.filter((c) => c.id !== car.id).some((c) => c.features.includes(feature));

  const specs: Array<{ label: string; render: (c: Car) => ReactNode }> = [
    { label: "Category", render: (c) => c.type },
    { label: "Year", render: (c) => String(c.year) },
    {
      label: "Seats",
      render: (c) => (
        <span className={c.seats === highestSeats ? "cmp-best" : ""}>
          {c.seats} seats
        </span>
      ),
    },
    { label: "Mileage Policy", render: (c) => c.range },
    { label: "Location", render: (c) => c.location },
    {
      label: "Rating",
      render: (c) => (
        <span className={c.rating === highestRating ? "cmp-best" : ""}>
          <span className="rating-star">★</span> {c.rating.toFixed(2)}
          <span className="cmp-review-count">({c.reviewCount})</span>
        </span>
      ),
    },
  ];

  return (
    <div className="cmp-view">
      {/* Nav */}
      <div className="cmp-nav">
        <button className="car-detail-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
        <span className="cmp-subtitle">{cars.length} cars compared</span>
      </div>

      <div className="cmp-table">
        {/* ── Car hero headers ── */}
        <div className="cmp-row cmp-row--header">
          <div className="cmp-label" />
          {cars.map((car) => {
            const gradient = BRAND_GRADIENTS[car.make] ?? DEFAULT_GRADIENT;
            return (
              <div key={car.id} className="cmp-car-header">
                <div className="cmp-hero" style={{ background: car.image ? undefined : gradient }}>
                  {car.image ? (
                    <img
                      className="car-image-photo"
                      src={car.image}
                      alt={`${car.make} ${car.model}`}
                      loading="lazy"
                    />
                  ) : null}
                  <div className="cmp-hero-fade" />
                  <div className="cmp-hero-text">
                    <span className="cmp-hero-make">{car.make}</span>
                    <span className="cmp-hero-model">{car.model}</span>
                    <span className="cmp-hero-year">{car.year}</span>
                  </div>
                </div>
                <div className={`cmp-price-row${car.pricePerDay === lowestPrice && cars.length > 1 ? " cmp-price-row--best" : ""}`}>
                  <span className="cmp-price">${car.pricePerDay}</span>
                  <span className="cmp-price-unit">/day</span>
                  {car.pricePerDay === lowestPrice && cars.length > 1 && (
                    <span className="cmp-badge">Best price</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Spec rows ── */}
        {specs.map((spec, i) => (
          <div key={spec.label} className={`cmp-row${i % 2 === 0 ? " cmp-row--alt" : ""}`}>
            <div className="cmp-label">{spec.label}</div>
            {cars.map((car) => (
              <div key={car.id} className="cmp-cell">
                {spec.render(car)}
              </div>
            ))}
          </div>
        ))}

        {/* ── Features row ── */}
        <div className="cmp-row cmp-row--features">
          <div className="cmp-label cmp-label--top">Features</div>
          {cars.map((car) => (
            <div key={car.id} className="cmp-cell cmp-cell--features">
              {car.features.map((f) => (
                <span
                  key={f}
                  className={`feature-tag${isUnique(f, car) ? " feature-tag--unique" : ""}`}
                >
                  {f}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* ── Book row ── */}
        <div className="cmp-row cmp-row--actions">
          <div className="cmp-label" />
          {cars.map((car) => (
            <div key={car.id} className="cmp-cell">
              <button className="car-detail-reserve" onClick={() => onBook(car)}>
                Book · ${car.pricePerDay}/day
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
