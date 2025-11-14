import {
  UserProfileState,
  InteractionHistoryState,
  EmotionalLoadState,
  TrustSafetyState,
  MatchCompatibilityState,
} from "loveops-world-model";

export type MatchRecommendation = {
  userId: string;
  candidateId: string;
  compatibility: MatchCompatibilityState;
};

export type MessageSuggestion = {
  matchId: string;
  senderId: string;
  text: string;
  tone: "warm_confident" | "playful" | "direct" | string;
  rationale: string;
};

export type PacingRecommendation = {
  userId: string;
  recommendedRate: "slow" | "normal" | "fast";
  notes: string;
};

export type SafetyAction = {
  userId: string;
  action: "limit_matches" | "require_verification" | "ban" | "warn";
  reason: string;
};

