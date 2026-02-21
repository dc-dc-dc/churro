# churro

A car rental UI built on a two-way channel between the customer and Claude. The customer's words and actions continuously inform Claude's understanding, and Claude continuously reshapes the interface in response — creating a feedback loop that guides users toward booking.

## The two-way channel

Most AI chat interfaces are one-directional: the user types, the AI replies. Churro treats the entire UI as a signal source. Claude receives two streams of input simultaneously:

**1. What the customer says** — conversational messages parsed for intent, preferences, and constraints.

**2. What the customer does** — every car clicked or viewed is captured as a behavioral signal and fed back to Claude on the next request:

```
User's recent on-page interactions (interest signals):
- Viewed/clicked: 2024 Tesla Model S ($180/day, electric, Los Angeles)
- Viewed/clicked: 2024 BMW M4 Competition ($220/day, sports, New York)
```

This means Claude is never working from words alone. A user who types "find me something" but has been clicking luxury EVs gets a very different response than one who has been browsing economy sedans — even though they said the same thing. The UI behavior is part of the conversation.

Claude's output closes the loop: a structured JSON response that directly controls which view renders, what filters apply, and what the assistant says — all in one round-trip.

```json
{
  "message": "Based on what you've been looking at, here are some more EVs you might like",
  "view": {
    "type": "cars",
    "data": { "filters": { "fuelType": "electric", "location": "Los Angeles" } }
  }
}
```

The customer changes → Claude adapts → the UI changes → the customer responds → repeat.

## What Claude understands

**Natural language intent**

"Something sporty for the weekend in LA" → `category: sports, location: Los Angeles`
"6 people, under $150" → `minSeats: 6, maxDailyRate: 15000`
"manual transmission" → `transmission: manual`

No form fields. No dropdowns. Claude extracts structure from conversation and applies every signal as a filter, combining them freely.

**Confidence-based progressive filtering**

Strong signals are applied immediately. Weak signals ("find me a car") show the full inventory plus one follow-up question — Claude never returns an empty state, it keeps the user engaged and moving toward a decision.

As confidence increases through the conversation, filters progressively tighten.

**UI orchestration**

Claude picks the right view for the moment:

- `cars` — filtered grid, resolved server-side against live inventory
- `car_detail` — full spec sheet + inline booking panel
- `comparison` — side-by-side spec table for 2–3 cars
- `booking` — booking form, pre-filled with location/dates inferred from conversation
- `empty` — welcome screen with featured cars and suggested prompts

There is no separate routing logic or filter state in the frontend. Claude decides what the user sees.

## Stack

- **Runtime**: [Bun](https://bun.sh) — server, bundler, package manager
- **Frontend**: React 19 + Tailwind CSS 4
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) via `ClaudeClient` in [src/claude.ts](src/claude.ts)
- **Inventory**: 100 cars across 8 categories, 27 makes, in New York and Los Angeles

## Getting started

```bash
# Install dependencies
bun install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Start dev server with hot reload
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

For production:

```bash
bun start
```

## Project structure

```
src/
  index.ts          # Bun server + /api/chat route + system prompt
  claude.ts         # ClaudeClient — chat and batch API
  App.tsx           # Root component — interaction tracking, view state
  types.ts          # Car, CarCategory, BookingUpsell types
  components/
    ChatBar.tsx     # Floating chat input + conversation history
    RenderSpace.tsx # Dynamic view renderer (cars, detail, booking, comparison)
    CarCard.tsx     # Car grid card
    CarComparison.tsx # Side-by-side comparison table
  data/
    inventory.ts    # 100-car inventory + searchInventory()
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `NODE_ENV` | No | Set to `production` to disable HMR |
