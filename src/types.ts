export type CarCategory =
  | "economy"
  | "sedan"
  | "suv"
  | "luxury"
  | "sports"
  | "minivan"
  | "electric"
  | "truck";

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  category: CarCategory;
  dailyRate: number;
  imageUrl: string;
  features: string[];
  seats: number;
  transmission: string;
  fuelType: string;
  available: boolean;
  mileagePolicy: string;
  location: string;           // city, e.g. "Austin, TX"
  pickupMethod: "Downtown" | "Airport";
}

export interface BookingUpsell {
  type: string;
  label: string;
  dailyRate: number;
  selected: boolean;
}
