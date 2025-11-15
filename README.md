# LoveOps Policies

Policy engines and workflows for the LoveOps matching system. This package provides matching, coaching, safety, and pacing engines that operate on event-sourced data via the Rhizome adapter.

## Overview

This package implements the policy layer for LoveOps, which:
- **Matches users** based on compatibility states and emotional load
- **Coaches users** by generating message suggestions via LLM
- **Enforces safety** by evaluating trust/safety states and applying moderation actions
- **Manages pacing** by adjusting match frequency based on engagement and burnout

All engines operate on event-sourced data through the `loveops-world-model` package, evaluating world views (states) and emitting new events back to the event log.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Workflows                              │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ runMatchingTick  │  │ runDailyMaintenance        │  │
│  └────────┬─────────┘  └────────────┬──────────────┘  │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Engines                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Matching     │  │ Coaching     │  │ Safety       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────┴──────────────────┴──────────────────┴───────┐ │
│  │              Pacing Engine                          │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Rhizome Adapter  │    │   LLM Client     │
│ (Event Store)    │    │   (Interface)    │
└────────┬─────────┘    └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      loveops-world-model                │
│  (World Views / State Evaluation)       │
└─────────────────────────────────────────┘
```

## Configuration

### Required Dependencies

1. **loveops-world-model**: Provides world views, event types, and state evaluation functions
   ```bash
   pnpm add loveops-world-model
   ```

2. **Rhizome Client**: Your event store implementation
   - Must implement methods for querying events and appending new events
   - See `LoveopsRhizomeClient` for the expected interface

3. **LLM Provider** (for CoachingEngine): Implement `LlmClient` interface
   - Can use OpenAI, Anthropic, or any other LLM provider
   - See `src/adapters/llm/LlmClient.ts` for the interface

### Rhizome Client Configuration

The `LoveopsRhizomeClient` wraps your Rhizome implementation. You need to provide a client that supports:

```typescript
interface RhizomeClient {
  // Query events for a single user
  queryEvents(params: { userId: string }): Promise<FactEvent[]>;
  
  // Query events for a pair of users
  queryEvents(params: { userIds: [string, string] }): Promise<FactEvent[]>;
  
  // Query candidate users for matching
  queryCandidateUsers(userId: string): Promise<string[]>;
  
  // Append new events to the log
  appendEvents(events: FactEvent[]): Promise<void>;
  
  // Query users needing matches (for workflows)
  queryUsersNeedingMatches(): Promise<string[]>;
  
  // Query active users (for maintenance)
  queryActiveUsers(): Promise<string[]>;
}
```

**Example setup:**
```typescript
import { LoveopsRhizomeClient } from "loveops-policies";
import { YourRhizomeClient } from "your-rhizome-package";

const rhizome = new YourRhizomeClient({
  // your rhizome config
});

const client = new LoveopsRhizomeClient(rhizome);
```

### LLM Client Configuration

Implement the `LlmClient` interface for message suggestion generation:

```typescript
import { LlmClient } from "loveops-policies";

class OpenAILlmClient implements LlmClient {
  async generateMessageSuggestion(params) {
    // Your OpenAI implementation
    // Return { text, tone, rationale }
  }
}

// Or use Anthropic, etc.
class AnthropicLlmClient implements LlmClient {
  async generateMessageSuggestion(params) {
    // Your Anthropic implementation
  }
}
```

**Example setup:**
```typescript
import { CoachingEngine } from "loveops-policies";
import { OpenAILlmClient } from "./your-llm-client";

const llmClient = new OpenAILlmClient({
  apiKey: process.env.OPENAI_API_KEY,
});

const coachingEngine = new CoachingEngine(rhizomeClient, llmClient);
```

## System Integration

### How It Works

1. **Event Sourcing**: All state is derived from events stored in Rhizome
2. **World Views**: The `loveops-world-model` package provides view functions that evaluate events into states:
   - `UserProfileStateView`
   - `EmotionalLoadView`
   - `MatchCompatibilityView`
   - `TrustSafetyStateView`
   - `InteractionHistoryView`
3. **Policy Engines**: Each engine:
   - Loads relevant events
   - Evaluates world views to get current state
   - Makes decisions based on state
   - Emits new events back to the log

### Workflow Integration

#### Matching Tick (`runMatchingTick`)

Runs periodically (e.g., hourly) to create new matches:

```typescript
import { runMatchingTick } from "loveops-policies/workflows";

// Run for all users needing matches
await runMatchingTick(rhizomeClient);

// Or run for specific users
await runMatchingTick(rhizomeClient, ["user1", "user2"]);
```

**What it does:**
1. Queries users who need new matches
2. For each user:
   - Evaluates their emotional load state
   - Finds candidate matches
   - Calculates compatibility for each candidate
   - Filters out marginal matches if user has high burnout
   - Creates top 3 matches and emits `MATCH_CREATED` events

#### Daily Maintenance (`runDailyMaintenance`)

Runs daily to evaluate safety and update pacing:

```typescript
import { runDailyMaintenance } from "loveops-policies/workflows";

await runDailyMaintenance(rhizomeClient);
```

**What it does:**
1. Queries all active users
2. For each user:
   - Evaluates trust/safety state
   - Applies safety actions if needed (ban, warn, limit matches, etc.)
   - Updates pacing recommendation based on emotional load and interaction history
   - Emits `MODERATION_ACTION_TAKEN` and `SYSTEM_PACING_UPDATED` events

### Engine Usage

#### MatchingEngine

```typescript
import { MatchingEngine } from "loveops-policies";

const matchingEngine = new MatchingEngine(rhizomeClient);

// Get recommendations (doesn't create events)
const recommendations = await matchingEngine.recommendForUser("user123");

// Create match events (recommends + emits events)
const matches = await matchingEngine.createMatchEvents("user123", 3);
```

#### CoachingEngine

```typescript
import { CoachingEngine } from "loveops-policies";

const coachingEngine = new CoachingEngine(rhizomeClient, llmClient);

// Generate a message suggestion
const suggestion = await coachingEngine.generateMessageSuggestion(
  "match456",
  "sender789",
  "recipient012"
);
// Returns: { matchId, senderId, text, tone, rationale }
// Also emits MESSAGE_SUGGESTION_GENERATED event
```

#### SafetyEngine

```typescript
import { SafetyEngine } from "loveops-policies";

const safetyEngine = new SafetyEngine(rhizomeClient);

// Evaluate if action is needed
const action = await safetyEngine.evaluateUserSafety("user123");
if (action) {
  // Apply the action (emits MODERATION_ACTION_TAKEN event)
  await safetyEngine.applySafetyAction(action);
}
```

#### PacingEngine

```typescript
import { PacingEngine } from "loveops-policies";

const pacingEngine = new PacingEngine(rhizomeClient);

// Get pacing recommendation (also emits SYSTEM_PACING_UPDATED event)
const pacing = await pacingEngine.recommendPacing("user123");
// Returns: { userId, recommendedRate: "slow" | "normal" | "fast", notes }
```

## Event Types

This package emits the following events (via `loveops-world-model`):

- `MATCH_CREATED`: When new matches are created
- `MESSAGE_SUGGESTION_GENERATED`: When coaching engine generates a suggestion
- `MODERATION_ACTION_TAKEN`: When safety engine applies an action
- `SYSTEM_PACING_UPDATED`: When pacing recommendation changes

## State Dependencies

Engines depend on these world views from `loveops-world-model`:

- **MatchingEngine**: `UserProfileStateView`, `EmotionalLoadView`, `MatchCompatibilityView`
- **CoachingEngine**: `MatchCompatibilityView`, `EmotionalLoadView`
- **SafetyEngine**: `TrustSafetyStateView`
- **PacingEngine**: `EmotionalLoadView`, `InteractionHistoryView`

Ensure your `loveops-world-model` package provides these views.

## Docker Usage

This package is a library, not a standalone application. The Docker container builds the package, but you need to override the CMD to run workflows.

### Building the Image

```bash
docker build -t loveops-policies .
```

### Running Workflows

Since this is a library package, you have a few options:

**Option 1: Use as a library in another service**
```bash
# Import and use in your own Node.js service
import { MatchingEngine, runMatchingTick } from "loveops-policies";
```

**Option 2: Override CMD to run workflows directly**
```bash
# Run matching tick (requires rhizome client setup)
docker run loveops-policies node -e "
  const { runMatchingTick } = require('./dist/workflows/runMatchingTick');
  const rhizomeClient = /* your client */;
  runMatchingTick(rhizomeClient).catch(console.error);
"

# Run daily maintenance
docker run loveops-policies node -e "
  const { runDailyMaintenance } = require('./dist/workflows/runDailyMaintenance');
  const rhizomeClient = /* your client */;
  runDailyMaintenance(rhizomeClient).catch(console.error);
"
```

**Option 3: Create your own entry point script**
Create a script that imports and calls the workflows with your rhizome client configuration, then override CMD to run that script.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev
```

## Type Safety

All types are exported from `src/types/policy.ts` and can be imported:

```typescript
import {
  MatchRecommendation,
  MessageSuggestion,
  PacingRecommendation,
  SafetyAction,
} from "loveops-policies";
```

## Notes

- All engines are stateless and operate purely on events
- State is always derived from events, never stored
- Engines can be run independently or via workflows
- The system is designed to be horizontally scalable (each engine instance is independent)

## Release Process

This package uses [Changesets](https://github.com/changesets/changesets) for version management. See [RELEASE.md](./RELEASE.md) for detailed release instructions.

### Quick Release Guide

1. Make your changes
2. Create a changeset: `pnpm changeset`
3. Commit and push
4. Merge PR to `main`
5. Release happens automatically via GitHub Actions

For more details, see [RELEASE.md](./RELEASE.md).

