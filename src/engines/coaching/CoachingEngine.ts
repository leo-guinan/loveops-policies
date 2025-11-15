import {
  DatingEventType,
  createDatingEvent,
  MatchCompatibilityState,
  EmotionalLoadState,
} from "loveops-world-model";
import { LoveopsRhizomeClient } from "../../adapters/rhizome/LoveopsRhizomeClient";
import { LlmClient } from "../../adapters/llm/LlmClient";
import { MessageSuggestion } from "../../types/policy";

/**
 * CoachingEngine: Generates message suggestions based on compatibility,
 * recent messages, and emotional load state.
 */
export class CoachingEngine {
  constructor(
    private client: LoveopsRhizomeClient,
    private llmClient: LlmClient
  ) {}

  async generateMessageSuggestion(
    matchId: string,
    senderId: string,
    recipientId: string
  ): Promise<MessageSuggestion> {
    // 1. Load pair events and evaluate states
    const pairEvents = await this.client.getEventsForPair(
      senderId,
      recipientId
    );
    const compatibility: MatchCompatibilityState =
      await this.client.evalView("MatchCompatibilityView", pairEvents);

    // 2. Load sender's emotional load
    const senderEvents = await this.client.getEventsForUser(senderId);
    const emotionalLoad: EmotionalLoadState =
      await this.client.evalView("EmotionalLoadView", senderEvents);

    // 3. Get recent messages (filter from pairEvents or separate query)
    const recentMessages = this.extractRecentMessages(pairEvents);

    // 4. Call LLM to generate suggestion
    const suggestion = await this.llmClient.generateMessageSuggestion({
      matchId,
      senderId,
      recipientId,
      compatibility,
      recentMessages,
      emotionalLoad,
    });

    // 5. Note: No event type exists for message suggestions in DatingEventType
    // The suggestion is returned to the caller who can handle it appropriately
    // If you need to track suggestions, consider storing them separately or
    // extending the event type enum in loveops-world-model

    return {
      matchId,
      senderId,
      text: suggestion.text,
      tone: suggestion.tone,
      rationale: suggestion.rationale,
    };
  }

  private extractRecentMessages(events: any[]): Array<{
    senderId: string;
    text: string;
    timestamp: Date;
  }> {
    // Extract message events from the event log
    // MessageSentPayload uses 'content' not 'text'
    return events
      .filter((e) => e.type === DatingEventType.MESSAGE_SENT)
      .map((e) => ({
        senderId: e.actorId,
        text: e.payload?.content || e.payload?.text || "",
        timestamp: new Date(e.timestamp),
      }))
      .slice(-10); // Last 10 messages
  }
}

