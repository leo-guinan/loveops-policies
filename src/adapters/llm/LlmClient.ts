/**
 * LLM Client interface - swappable for OpenAI/Anthropic/etc.
 */
export interface LlmClient {
  generateMessageSuggestion(params: {
    matchId: string;
    senderId: string;
    recipientId: string;
    compatibility: any; // MatchCompatibilityState
    recentMessages?: Array<{ senderId: string; text: string; timestamp: Date }>;
    emotionalLoad?: any; // EmotionalLoadState
  }): Promise<{
    text: string;
    tone: "warm_confident" | "playful" | "direct" | string;
    rationale: string;
  }>;
}

