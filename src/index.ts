import { serve } from "bun";
import index from "./index.html";
import { ClaudeClient } from "./claude";
import { searchInventory, carInventory } from "./data/inventory";

// ── Inventory → frontend Car shape ───────────────────────────────────────────
// The frontend CarCard expects: pricePerDay, rating, reviewCount, type, range.
// inventory.ts stores:          dailyRate (cents), category, mileagePolicy.

type InventoryCar = {
  id: string; make: string; model: string; year: number;
  category: string; dailyRate: number; imageUrl: string;
  features: string[]; seats: number; transmission: string;
  fuelType: string; available: boolean; mileagePolicy: string;
  location: string; pickupMethod: "Downtown" | "Airport";
};

type FrontendCar = {
  id: string; make: string; model: string; year: number;
  pricePerDay: number; rating: number; reviewCount: number;
  type: string; seats: number; range: string;
  location: string; pickupMethod: string; features: string[];
  image: string; transmission: string; fuelType: string;
};

function pseudoRating(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.round((4.75 + (hash % 25) / 100) * 100) / 100;
}
function pseudoReviewCount(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 50 + (hash % 200);
}

function findCarByMakeModel(make: string, model: string): InventoryCar | undefined {
  const ml = make.toLowerCase();
  const mdl = model.toLowerCase();
  return (carInventory as unknown as InventoryCar[]).find(
    (c) => c.make.toLowerCase().includes(ml) && c.model.toLowerCase().includes(mdl),
  );
}

function toFrontendCar(car: InventoryCar): FrontendCar {
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

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant for a premium car rental platform called Churro. Help users find the perfect car.

## Inventory overview
100 cars across 8 categories, located in New York NY and Los Angeles CA.
All inventory is queried server-side using the filters you provide.

Categories (exact strings):
  economy | sedan | suv | luxury | sports | minivan | electric | truck

Makes available:
  Audi | BMW | Cadillac | Chevrolet | Chrysler | Dodge | Ford | Genesis | GMC |
  Honda | Hyundai | Jeep | Kia | Land Rover | Lexus | Mazda | Mercedes-AMG |
  Mercedes-Benz | Nissan | Polestar | Porsche | RAM | Subaru | Tesla | Toyota |
  Volkswagen | Volvo

Daily rate ranges:
  economy: $36–$55/day   | sedan: $58–$78/day   | suv: $76–$135/day
  luxury: $125–$280/day  | sports: $85–$350/day  | minivan: $85–$95/day
  electric: $85–$200/day | truck: $88–$135/day

Seats: 2 | 4 | 5 | 7 | 8 | 9
Fuel types: gasoline | hybrid | electric
Transmissions: automatic | manual (manual in sports only)
Mileage policies: Unlimited | 200 miles/day | 150 miles/day | 100 miles/day | 75 miles/day
Pickup method: "Downtown" | "Airport"

Common features (use exact strings in the features array):
  AWD | 4WD | Autopilot | Full Self-Driving | Apple CarPlay | Android Auto |
  Wireless CarPlay | Wireless Charging | Heated Seats | Heated/Cooled Seats |
  Massage Seats | Panoramic Roof | Panoramic Sunroof | Sunroof | Glass Roof |
  Adaptive Cruise | Lane Assist | Blind Spot | Night Vision | Heads-Up Display |
  Third Row | Stow 'n Go | Rear Entertainment | Towing | Off-Road Package |
  Trail Rated | GOAT Modes | Sasquatch Package | Launch Control | Track Mode |
  Bose Audio | Harman Kardon | B&O Audio | Mark Levinson Audio | Burmester Audio |
  BOSE Audio | Bang & Olufsen | McIntosh Audio | Meridian Audio |
  Plug-In Hybrid | Solar Roof | Dual Motor AWD | Performance Package

## Filter keys — all supported
  "category"       — one of the 8 category strings
  "make"           — brand name, e.g. "Tesla", "BMW" (case-insensitive substring)
  "model"          — model name, e.g. "Model S", "RAV4" (case-insensitive substring)
  "transmission"   — "automatic" or "manual"
  "fuelType"       — "gasoline", "hybrid", or "electric"
  "mileagePolicy"  — e.g. "Unlimited", "100 miles" (case-insensitive substring)
  "maxDailyRate"   — max price in cents (e.g. 10000 = $100/day)
  "minDailyRate"   — min price in cents
  "minSeats"       — minimum seat count
  "features"       — array of feature strings (car matches if it has ANY one — case-insensitive)
  "location"       — "New York" or "Los Angeles"
  "pickupMethod"   — "Downtown" or "Airport"

Respond ONLY with a valid JSON object — no markdown, no code fences — in this exact shape:
{
  "message": "Your conversational reply to the user",
  "view": { "type": "cars", "data": { "filters": { /* filter keys */ } } }
}

View rules:
- "cars"       → show a car grid; set "data.filters" to match the request. Leave filters empty ({}) to show all.
- "comparison" → side-by-side comparison. Set "data.cars" to 2–3 { "make", "model" } objects using exact
                inventory strings (e.g. "Tesla"+"Model S", "Porsche"+"911 Carrera", "BMW"+"M4 Competition").
                Trigger on: "compare", "vs", "side by side", "which is better between", etc.
- "booking"    → show booking form; include optional "data": { location, startDate, endDate }.
- "empty"      → return to welcome screen.
- Omit "view" entirely for pure clarifying questions.

## Confidence-based filtering (IMPORTANT)

You can ALWAYS show a filtered car list AND ask a follow-up in the same response.

STRONG signals — apply immediately:
- Brand: "Tesla" → make: "Tesla", "BMW" → make: "BMW"
- Model: "Model 3" → model: "Model 3", "RAV4" → model: "RAV4"
- Type/vibe: "sporty" → sports, "electric" / "EV" → electric, "SUV" → suv, "truck" → truck,
  "luxury" → luxury, "family" → minivan or suv, "off-road" → suv or truck
- Fuel: "hybrid" → fuelType: "hybrid", "gas" → fuelType: "gasoline"
- Transmission: "manual" → transmission: "manual", "stick shift" → transmission: "manual"
- Budget: "cheap" → maxDailyRate: 5500, "under $X/day" → maxDailyRate: X*100
- Seats: "6 people" → minSeats: 6, "family of 7" → minSeats: 7
- City: "New York" / "NYC" → location: "New York", "LA" / "California" → location: "Los Angeles"
- Pickup: "airport" → pickupMethod: "Airport", "downtown" → pickupMethod: "Downtown"
- Feature requests: "heated seats" → features: ["Heated Seats"], "AWD" → features: ["AWD"],
  "sunroof" → features: ["Sunroof", "Panoramic Sunroof", "Panoramic Roof"]

WEAK / NO signal — show all + ask one question:
- "find me a car", "what do you have?", "show me something", "I need a car"

Decision logic:
1. Apply every signal as a filter — combine multiple filters freely.
2. If still uncertain after filtering, add ONE short follow-up question.
3. Only omit the view if there is literally zero signal.

Examples:
- "Tesla Model 3" → make: "Tesla", model: "Model 3"
- "manual sports car" → category: "sports", transmission: "manual"
- "hybrid SUV in NY" → category: "suv", fuelType: "hybrid", location: "New York"
- "AWD under $150" → features: ["AWD"], maxDailyRate: 15000
- "something fun for the weekend" → category: "sports" + "Any city preference?"
- "6 people" → minSeats: 6 + "Road trip or city driving?"

## When showing cars
1–2 sentences explaining the selection. Do not pad.
As confidence increases through the conversation, progressively tighten filters.`;

// ── Claude client ─────────────────────────────────────────────────────────────
let claude: ClaudeClient | null = null;
try {
  claude = new ClaudeClient();
} catch {
  console.warn("[claude] ANTHROPIC_API_KEY not set — /api/chat will return errors");
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = serve({
  routes: {
    "/*": index,

    "/api/chat": {
      async POST(req) {
        if (!claude) {
          return Response.json({ message: "API key not configured." }, { status: 503 });
        }

        const { message, history = [], interactions = [] } = await req.json() as {
          message: string;
          history: Array<{ role: "user" | "assistant"; content: string }>;
          interactions: Array<{ type: string; car: Record<string, unknown>; timestamp: string }>;
        };

        // Append interaction signals to the system prompt so Claude has context
        const interactionLines = interactions
          .slice(-10)
          .map((i) => `- Viewed/clicked: ${i.car.year} ${i.car.make} ${i.car.model} ($${i.car.pricePerDay}/day, ${i.car.type}, ${i.car.location})`);

        const systemPrompt = interactionLines.length
          ? `${BASE_SYSTEM_PROMPT}\n\nUser's recent on-page interactions (interest signals):\n${interactionLines.join("\n")}`
          : BASE_SYSTEM_PROMPT;

        try {
          const text = await claude.chat(message, {
            system: systemPrompt,
            history,
            maxTokens: 1024,
          });

          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch?.[0] ?? text) as {
              message: string;
              view?: {
                type: string;
                data?: {
                  filters?: Record<string, unknown>;
                  cars?: Array<{ make: string; model: string }>;
                };
              };
            };

            // Comparison view — resolve each make/model to a real inventory car
            if (parsed.view?.type === "comparison") {
              const specs = (parsed.view.data?.cars ?? []) as Array<{ make: string; model: string }>;
              const matched = specs
                .map(({ make, model }) => findCarByMakeModel(make, model))
                .filter(Boolean)
                .map((c) => toFrontendCar(c!));
              return Response.json({
                message: parsed.message,
                view: { type: "comparison", data: { cars: matched } },
              });
            }

            // If Claude returned a "cars" view with filters, query the real inventory
            if (parsed.view?.type === "cars") {
              const filters = (parsed.view.data?.filters ?? {}) as {
                category?: import("./types").CarCategory;
                make?: string;
                model?: string;
                transmission?: string;
                fuelType?: string;
                mileagePolicy?: string;
                maxDailyRate?: number;
                minDailyRate?: number;
                minSeats?: number;
                features?: string[];
                location?: string;
                pickupMethod?: "Downtown" | "Airport";
                available?: boolean;
              };

              const matched = searchInventory({ ...filters, available: true });
              const frontendCars: FrontendCar[] = matched.map((c) => toFrontendCar(c as unknown as InventoryCar));

              return Response.json({
                message: parsed.message,
                view: { type: "cars", data: { cars: frontendCars } },
              });
            }

            return Response.json(parsed);
          } catch {
            return Response.json({ message: text });
          }
        } catch (err) {
          console.error("[api/chat]", err);
          return Response.json({ message: "I'm having trouble connecting. Please try again." }, { status: 500 });
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
