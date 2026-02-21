import { serve } from "bun";
import index from "./index.html";
import { ClaudeClient } from "./claude";

// ── Car inventory ────────────────────────────────────────────────────────────
// In a real app this would come from a database.
const CAR_INVENTORY = [
  { id: "1", make: "Tesla", model: "Model S Plaid", year: 2024, pricePerDay: 189, rating: 4.97, reviewCount: 234, type: "Electric", seats: 5, range: "396 mi", location: "San Francisco, CA", features: ["Autopilot", "Ludicrous Mode", "Premium Audio"] },
  { id: "2", make: "Porsche", model: "911 Carrera", year: 2023, pricePerDay: 295, rating: 4.92, reviewCount: 87, type: "Sport", seats: 4, range: "22 MPG", location: "Los Angeles, CA", features: ["Sport Chrono", "Bose Audio", "PDK Gearbox"] },
  { id: "3", make: "Mercedes-Benz", model: "G 63 AMG", year: 2024, pricePerDay: 350, rating: 4.88, reviewCount: 156, type: "SUV", seats: 5, range: "15 MPG", location: "Miami, FL", features: ["AMG Performance", "Panoramic Roof", "Burmester Audio"] },
  { id: "4", make: "BMW", model: "M4 Competition", year: 2023, pricePerDay: 245, rating: 4.95, reviewCount: 112, type: "Sport", seats: 4, range: "19 MPG", location: "Chicago, IL", features: ["M Sport Diff", "Carbon Roof", "Harman Kardon"] },
  { id: "5", make: "Rivian", model: "R1T", year: 2024, pricePerDay: 165, rating: 4.89, reviewCount: 203, type: "Electric Truck", seats: 5, range: "314 mi", location: "Denver, CO", features: ["Off-road Mode", "Camp Kitchen", "Gear Tunnel"] },
  { id: "6", make: "Lamborghini", model: "Urus", year: 2023, pricePerDay: 495, rating: 4.94, reviewCount: 67, type: "Sport SUV", seats: 5, range: "14 MPG", location: "Las Vegas, NV", features: ["V8 Twin-Turbo", "Carbon Ceramic Brakes", "Sport Exhaust"] },
];

const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant for a premium car rental platform called Churro. Help users find the perfect car.

Available inventory:
${JSON.stringify(CAR_INVENTORY, null, 2)}

Respond ONLY with a valid JSON object — no markdown, no code fences — in this exact shape:
{
  "message": "Your conversational reply to the user",
  "view": { "type": "cars", "data": { "cars": [ /* matching car objects */ ] } }
}

View rules:
- "cars"    → show a car grid; include "data.cars" with matching inventory objects.
- "booking" → show booking form; include optional "data": { location, startDate, endDate }.
- "empty"   → return to welcome screen.
- Omit "view" entirely for clarifying questions or conversational replies.

## Confidence-based filtering (IMPORTANT)

You can ALWAYS show a filtered car list AND ask a follow-up question in the same response.
The view and the message are independent — use both whenever it helps.

Estimate your filtering confidence from available signals:

STRONG signals (apply immediately as filters, show results):
- Vehicle type/vibe: "sporty", "electric", "SUV", "truck", "luxury", "fun", "family", "off-road"
- Budget: "cheap", "under $X", "premium", "budget-friendly"
- Use case: "road trip", "moving", "weekend", "commute", "adventure"
- Interaction signals: cars the user has clicked are strong preference indicators — weight them heavily

WEAK / NO signal:
- Completely open requests with no filtering hint: "find me a car", "what do you have?",
  "show me something", "I need a car"
- In this case, show all inventory AND ask one question to start narrowing down

Decision logic:
1. Apply every signal you have as filters — even a single weak signal is worth acting on.
2. Show the best-matching subset of inventory in the view.
3. If you filtered down but are still uncertain about something useful (location, budget, etc.),
   append ONE short follow-up question in the message — keep it casual, one sentence.
4. Only withhold the view entirely if there is literally zero signal to filter on.

Examples:
- "sporty car" → show sport cars + ask "Any city preference?"
- "something fun for the weekend" → show sport/electric + "What's your rough budget?"
- "I need an SUV" → show SUVs, no question needed
- "under $200 a day" → show matching cars + "What kind of trip are you planning?"
- "find me a car" + no interactions → show all + "What kind of driving are you planning?"
- "find me a car" + clicked Tesla → show EVs/premium + "Looking for electric specifically?"
- Clicked a sporty car → infer performance interest, surface similar cars proactively

## When showing cars
Select cars that genuinely match. Briefly explain why. Do not pad — if only one or two match well,
show only those. As confidence increases through the conversation, progressively tighten the filter.`;

// ── Claude client ────────────────────────────────────────────────────────────
let claude: ClaudeClient | null = null;
try {
  claude = new ClaudeClient();
} catch {
  console.warn("[claude] ANTHROPIC_API_KEY not set — /api/chat will return errors");
}

// ── Server ───────────────────────────────────────────────────────────────────
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
            // Claude should return raw JSON, but strip any accidental markdown fences
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch?.[0] ?? text);
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
