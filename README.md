# LoveOps Policies

**Library package** providing policy engines and workflows for the LoveOps matching system. This package is embedded **in-process** within `loveops-world-model` and `loveops-views` services, not deployed as a separate service.

## Overview

This library implements the policy layer for LoveOps, which:
- **Matches users** based on compatibility states and emotional load
- **Coaches users** by generating message suggestions via LLM
- **Enforces safety** by evaluating trust/safety states and applying moderation actions
- **Manages pacing** by adjusting match frequency based on engagement and burnout

All engines operate on event-sourced data through the `loveops-world-model` package, evaluating world views (states) and emitting new events back to the event log.

## Architecture

This is a **library package** used by:
- **loveops-world-model**: Uses policy library for event processing logic
- **loveops-views**: Uses policy library for matching and coaching logic (processes `loveops-policy-matching` and `loveops-policy-coaching` queues)

The library is installed as a dependency and used **in-process** within these services. Queue processing happens in-process using the `QueueProcessor` helper in each service.

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│              Services (loveops-views, world-model)       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Queue Processors (in-process)                    │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │ Matching     │  │ Coaching     │              │  │
│  │  │ Engine       │  │ Engine       │              │  │
│  │  └──────┬───────┘  └──────┬───────┘              │  │
│  │         │                  │                       │  │
│  │  ┌──────┴──────────────────┴───────────────────┐ │  │
│  │  │  Safety & Pacing Engines                    │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
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
   - `TrustSafetyView`
   - `InteractionHistoryView`
3. **Policy Engines**: Each engine:
   - Loads relevant events
   - Evaluates world views to get current state
   - Makes decisions based on state
   - Emits new events back to the log

### Using in Services

This library is embedded **in-process** within services. Services import and use engines/workflows directly:

#### In loveops-views Service

Processes `loveops-policy-matching` and `loveops-policy-coaching` queues:

```typescript
import { MatchingEngine, CoachingEngine, runMatchingTick } from "loveops-policies";
import { QueueProcessor } from "./queue-processor";

class ViewsQueueProcessor extends QueueProcessor {
  protected async processJob(queueName: string, job: Job): Promise<boolean> {
    const rhizomeClient = this.getRhizomeClient();
    const client = new LoveopsRhizomeClient(rhizomeClient);
    
    if (queueName === "loveops-policy-matching") {
      const matchingEngine = new MatchingEngine(client);
      const userId = job.payload.userId;
      await matchingEngine.createMatchEvents(userId, 3);
      return true;
    }
    
    if (queueName === "loveops-policy-coaching") {
      const llmClient = this.getLlmClient();
      const coachingEngine = new CoachingEngine(client, llmClient);
      const { matchId, senderId, recipientId } = job.payload;
      await coachingEngine.generateMessageSuggestion(matchId, senderId, recipientId);
      return true;
    }
    
    return false;
  }
}
```

#### In loveops-world-model Service

Uses policy library for event processing:

```typescript
import { SafetyEngine, PacingEngine, runDailyMaintenance } from "loveops-policies";

// Use engines directly for event processing logic
const safetyEngine = new SafetyEngine(rhizomeClient);
const action = await safetyEngine.evaluateUserSafety(userId);
```

### Workflow Functions

Workflows can be called directly or used in queue processors:

```typescript
import { runMatchingTick, runDailyMaintenance } from "loveops-policies";

// Run matching tick (e.g., from scheduled job or queue processor)
await runMatchingTick(rhizomeClient);

// Run daily maintenance
await runDailyMaintenance(rhizomeClient);
```

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

## Installation

Install as a dependency in your service:

```bash
pnpm add loveops-policies
# or
npm install loveops-policies
```

## Docker Usage

This package is a **library**, not a standalone service. The Dockerfile is provided for building the package, but in production this library is embedded within `loveops-world-model` and `loveops-views` services.

### Building the Package

```bash
docker build -t loveops-policies .
```

The built package can then be:
- Published to npm for use as a dependency
- Used as a local dependency in a monorepo
- Copied into service containers that need it

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

- **Library Package**: This is not a standalone service - it's embedded in-process within other services
- **Stateless**: All engines are stateless and operate purely on events
- **Event-Driven**: State is always derived from events, never stored
- **In-Process Processing**: Queue processing happens in-process within services, not in separate worker containers
- **Reusable**: Engines can be imported and used directly in any service that needs policy logic

## Release Process

This package uses [Changesets](https://github.com/changesets/changesets) for version management. See [RELEASE.md](./RELEASE.md) for detailed release instructions.

### Quick Release Guide

1. Make your changes
2. Create a changeset: `pnpm changeset`
3. Commit and push
4. Merge PR to `main`
5. Release happens automatically via GitHub Actions

For more details, see [RELEASE.md](./RELEASE.md).

