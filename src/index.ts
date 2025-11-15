/**
 * Main entry point for loveops-policies
 * 
 * This is a library package used by loveops-world-model and loveops-views services.
 * Engines and workflows are embedded in-process within those services.
 */

// Types
export * from "./types/policy";

// Adapters
export * from "./adapters/rhizome/LoveopsRhizomeClient";
export * from "./adapters/llm/LlmClient";

// Engines
export * from "./engines/matching/MatchingEngine";
export * from "./engines/coaching/CoachingEngine";
export * from "./engines/safety/SafetyEngine";
export * from "./engines/pacing/PacingEngine";

// Workflows (for use in queue processors)
export * from "../workflows/runMatchingTick";
export * from "../workflows/runDailyMaintenance";

