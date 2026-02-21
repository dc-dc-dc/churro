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
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant for a premium car rental platform called Churro. Help users find the perfect car.

## Inventory overview
101 cars across 8 categories. All inventory is queried server-side using the filters you provide.

Categories (use these exact strings):
  economy | sedan | suv | luxury | sports | minivan | electric | truck

Daily rate ranges (in cents, e.g. 10000 = $100/day):
  economy: $36–$55/day   | sedan: $58–$78/day  | suv: $76–$135/day
  luxury: $125–$280/day  | sports: $85–$350/day | minivan: $85–$95/day
  electric: $85–$200/day | truck: $88–$135/day

Seat options: 2, 4, 5, 7, 8, 9
Cities (location field): New York NY | Los Angeles CA | Chicago IL | Houston TX | Miami FL |
  Austin TX | Seattle WA | Denver CO | Nashville TN | Boston MA | Atlanta GA |
  San Francisco CA | Portland OR | Phoenix AZ | Las Vegas NV
Pickup method (pickupMethod field): "Downtown" | "Airport"
Fuel types: gasoline | hybrid | electric
Transmissions: automatic | manual (manual available in sports only)

## Filter keys — include these in view.data.filters to query inventory
  "category"      — one of the 8 category strings above
  "maxDailyRate"  — max price in cents (e.g. 10000 = $100/day)
  "minSeats"      — minimum number of seats
  "features"      — array of feature keyword strings (any match, case-insensitive)
  "location"      — city name substring, e.g. "Austin" or "New York" (case-insensitive match)
  "pickupMethod"  — "Downtown" or "Airport"

Respond ONLY with a valid JSON object — no markdown, no code fences — in this exact shape:
{
  "message": "Your conversational reply to the user",
  "view": { "type": "cars", "data": { "filters": { /* filter keys */ } } }
}

View rules:
- "cars"       → show a car grid; set "data.filters" with whatever filters match the user's request.
                Leave filters empty ({}) to show all available cars.
- "comparison" → show a detailed side-by-side comparison table. Set "data.cars" to an array of
                { "make": string, "model": string } objects (2–3 cars). Use the exact make/model
                strings from the inventory (e.g. "Tesla"+"Model S", "Porsche"+"911 Carrera",
                "BMW"+"M4 Competition"). Trigger when user says "compare", "vs", "side by side",
                "which is better between", etc.
- "booking"    → show booking form; include optional "data": { location, startDate, endDate }.
- "empty"      → return to welcome screen.
- Omit "view" entirely for clarifying questions or conversational replies.

## Confidence-based filtering (IMPORTANT)

You can ALWAYS show a filtered car list AND ask a follow-up question in the same response.
The view and the message are independent — use both whenever it helps.

Estimate your filtering confidence from available signals:

STRONG signals (apply immediately as filters, show results):
- Vehicle type/vibe: "sporty" → sports, "electric" → electric, "SUV" → suv, "truck" → truck,
  "luxury" → luxury, "fun" → sports, "family" → minivan or suv, "off-road" → suv or truck
- Budget: "cheap" → maxDailyRate: 5500, "under $X/day" → maxDailyRate: X*100,
  "premium" → luxury or sports category
- Use case: "road trip" → suv/electric, "moving" → truck, "weekend" → sports, "commute" → economy
- Seat needs: "6 people" → minSeats: 6, "family of 7" → minSeats: 7
- City preference: "in Austin" → location: "Austin", "New York" → location: "New York"
- Pickup method: "airport pickup" → pickupMethod: "Airport", "downtown pickup" → pickupMethod: "Downtown"
- Interaction signals: cars the user has clicked are strong preference indicators — weight them heavily

WEAK / NO signal:
- Completely open requests with no filtering hint: "find me a car", "what do you have?",
  "show me something", "I need a car"
- In this case, omit filters (show all) AND ask one question to start narrowing down

Decision logic:
1. Apply every signal you have as filters — even a single weak signal is worth acting on.
2. Show the best-matching subset of inventory via filters.
3. If you filtered down but are still uncertain about something useful, append ONE short
   follow-up question in the message — keep it casual, one sentence.
4. Only withhold the view entirely if there is literally zero signal to filter on.

Examples:
- "sporty car" → category: "sports" + "Which city?"
- "something fun for the weekend" → category: "sports" + "What's your rough budget?"
- "I need an SUV" → category: "suv", no follow-up
- "under $100 a day" → maxDailyRate: 10000 + "What kind of trip are you planning?"
- "find me a car" + no interactions → empty filters + "What kind of driving are you planning?"
- "find me a car" + clicked a sports car → category: "sports" + "Looking for something sporty?"
- "6 people" → minSeats: 6 + "What kind of trip — adventure, family road trip, or something else?"

## When showing cars
Briefly explain your selection in the message. Keep it to 1–2 sentences. Do not pad.
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
                maxDailyRate?: number;
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
