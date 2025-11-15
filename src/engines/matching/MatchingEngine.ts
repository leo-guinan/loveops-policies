import {
  MatchCompatibilityState,
  DatingEventType,
  createDatingEvent,
  FactEvent,
  EmotionalLoadState,
} from "loveops-world-model";
import { LoveopsRhizomeClient } from "../../adapters/rhizome/LoveopsRhizomeClient";
import { MatchRecommendation } from "../../types/policy";

/**
 * MatchingEngine: Recommends matches based on compatibility states
 * and respects emotional load constraints.
 */
export class MatchingEngine {
  constructor(private client: LoveopsRhizomeClient) {}

  async recommendForUser(userId: string): Promise<MatchRecommendation[]> {
    // 1. load user's events & state
    const userEvents = await this.client.getEventsForUser(userId);
    const userProfile = await this.client.evalView(
      "UserProfileStateView",
      userEvents
    );
    const emoState: EmotionalLoadState = await this.client.evalView(
      "EmotionalLoadView",
      userEvents
    );

    // 2. choose candidate pool (pseudo-code: probably another query)
    const candidates = await this.client.queryCandidateUsers(userId);

    const recs: MatchRecommendation[] = [];

    for (const candidateId of candidates) {
      const pairEvents = await this.client.getEventsForPair(userId, candidateId);
      const compatibility: MatchCompatibilityState =
        await this.client.evalView("MatchCompatibilityView", pairEvents);

      // respect emotional load: don't push marginal matches if user is fried
      if (
        emoState.burnoutLevel > 0.7 &&
        compatibility.compatibilityScore < 0.7
      ) {
        continue;
      }

      recs.push({ userId, candidateId, compatibility });
    }

    // sort best-first
    recs.sort(
      (a, b) =>
        b.compatibility.compatibilityScore - a.compatibility.compatibilityScore
    );

    return recs;
  }

  async createMatchEvents(userId: string, topN = 3) {
    const recs = await this.recommendForUser(userId);
    const selected = recs.slice(0, topN);

    const events = selected.map((rec) => {
      // Generate matchId - in production, this might come from your match service
      const matchId = `${userId}_${rec.candidateId}_${Date.now()}`;
      
      return createDatingEvent({
        source: "system:matchmaker",
        actorId: userId,
        targetId: rec.candidateId,
        domain: "match",
        type: DatingEventType.MATCH_CREATED,
        payload: {
          matchId,
          userA: userId,
          userB: rec.candidateId,
          // Store compatibility metadata separately if needed
          // The payload structure matches MatchCreatedPayload type
        },
      });
    });

    await this.client.appendEvents(events);
    return selected;
  }
}

