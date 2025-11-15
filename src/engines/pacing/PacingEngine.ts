import {
  DatingEventType,
  createDatingEvent,
  EmotionalLoadState,
  InteractionHistoryState,
} from "loveops-world-model";
import { LoveopsRhizomeClient } from "../../adapters/rhizome/LoveopsRhizomeClient";
import { PacingRecommendation } from "../../types/policy";

/**
 * PacingEngine: Uses EmotionalLoadView and InteractionHistoryView
 * to produce PacingRecommendation.
 * Emits events such as SYSTEM_PACING_UPDATED for the UI/feed engine to respect.
 */
export class PacingEngine {
  constructor(private client: LoveopsRhizomeClient) {}

  async recommendPacing(userId: string): Promise<PacingRecommendation> {
    // 1. Load user events and evaluate states
    const userEvents = await this.client.getEventsForUser(userId);
    const emotionalLoad: EmotionalLoadState = await this.client.evalView(
      "EmotionalLoadView",
      userEvents
    );
    const interactionHistory: InteractionHistoryState =
      await this.client.evalView("InteractionHistoryView", userEvents);

    // 2. Determine recommended rate based on states
    const recommendedRate = this.calculateRecommendedRate(
      emotionalLoad,
      interactionHistory
    );

    // 3. Generate notes explaining the recommendation
    const notes = this.generateNotes(emotionalLoad, interactionHistory);

    const recommendation: PacingRecommendation = {
      userId,
      recommendedRate,
      notes,
    };

    // 4. Emit event for UI/feed engine
    await this.emitPacingUpdate(recommendation);

    return recommendation;
  }

  private calculateRecommendedRate(
    emotionalLoad: EmotionalLoadState,
    interactionHistory: InteractionHistoryState
  ): "slow" | "normal" | "fast" {
    // High burnout -> slow pacing
    if (emotionalLoad.burnoutLevel > 0.7) {
      return "slow";
    }

    // Low engagement -> slow pacing
    // Adjust property access based on actual InteractionHistoryState structure
    const avgResponseTime = (interactionHistory as any).averageResponseTime 
      ?? (interactionHistory as any).avgResponseTimeMs
      ?? (interactionHistory as any).responseTime
      ?? Infinity;
    
    if (avgResponseTime > 48 * 60 * 60 * 1000) {
      // > 48 hours average response time
      return "slow";
    }

    // High engagement + low burnout -> fast pacing
    if (
      emotionalLoad.burnoutLevel < 0.3 &&
      avgResponseTime < 2 * 60 * 60 * 1000
    ) {
      // < 2 hours average response time
      return "fast";
    }

    // Default to normal
    return "normal";
  }

  private generateNotes(
    emotionalLoad: EmotionalLoadState,
    interactionHistory: InteractionHistoryState
  ): string {
    const notes: string[] = [];

    if (emotionalLoad.burnoutLevel > 0.7) {
      notes.push(
        `High burnout detected (${(emotionalLoad.burnoutLevel * 100).toFixed(0)}%). Reducing match frequency.`
      );
    }

    // Adjust property access based on actual InteractionHistoryState structure
    const avgResponseTime = (interactionHistory as any).averageResponseTime 
      ?? (interactionHistory as any).avgResponseTimeMs
      ?? (interactionHistory as any).responseTime
      ?? Infinity;

    if (avgResponseTime > 48 * 60 * 60 * 1000) {
      notes.push(
        `Slow response patterns detected. Adjusting pacing to match engagement level.`
      );
    }

    if (
      emotionalLoad.burnoutLevel < 0.3 &&
      avgResponseTime < 2 * 60 * 60 * 1000
    ) {
      notes.push(
        `High engagement and low burnout. Increasing match frequency.`
      );
    }

    return notes.join(" ") || "Normal pacing recommended.";
  }

  private async emitPacingUpdate(
    recommendation: PacingRecommendation
  ): Promise<void> {
    // Note: Using SYSTEM_EVENT type since SYSTEM_PACING_UPDATED doesn't exist
    const event = createDatingEvent({
      source: "system:pacing",
      actorId: recommendation.userId,
      targetId: recommendation.userId, // self-action
      domain: "system",
      type: DatingEventType.SYSTEM_EVENT,
      payload: {
        eventType: "system_pacing_updated",
        recommendedRate: recommendation.recommendedRate,
        notes: recommendation.notes,
      },
    });

    await this.client.appendEvents([event]);
  }
}

