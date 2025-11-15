import {
  DatingEventType,
  createDatingEvent,
  TrustSafetyState,
} from "loveops-world-model";
import { LoveopsRhizomeClient } from "../../adapters/rhizome/LoveopsRhizomeClient";
import { SafetyAction } from "../../types/policy";

/**
 * SafetyEngine: Uses TrustSafetyStateView + reports to propose SafetyActions.
 * Converts accepted SafetyActions to events like MODERATION_ACTION_TAKEN.
 */
export class SafetyEngine {
  constructor(private client: LoveopsRhizomeClient) {}

  async evaluateUserSafety(userId: string): Promise<SafetyAction | null> {
    // 1. Load user events and evaluate trust/safety state
    const userEvents = await this.client.getEventsForUser(userId);
    const trustSafety: TrustSafetyState = await this.client.evalView(
      "TrustSafetyView",
      userEvents
    );

    // 2. Check for reports (would come from separate query or be in events)
    const reports = await this.getReportsForUser(userId);

    // 3. Determine if action is needed
    const action = this.determineSafetyAction(trustSafety, reports);

    if (!action) {
      return null;
    }

    return {
      userId,
      action: action.type,
      reason: action.reason,
    };
  }

  async applySafetyAction(action: SafetyAction): Promise<void> {
    // Convert SafetyAction to event
    // Note: Using SAFETY domain and SYSTEM_EVENT type since MODERATION_ACTION_TAKEN doesn't exist
    const event = createDatingEvent({
      source: "system:safety",
      actorId: action.userId,
      targetId: action.userId, // self-action
      domain: "safety",
      type: DatingEventType.SYSTEM_EVENT,
      payload: {
        eventType: "moderation_action_taken",
        action: action.action,
        reason: action.reason,
      },
    });

    await this.client.appendEvents([event]);
  }

  private async getReportsForUser(userId: string): Promise<any[]> {
    // Pseudo-code: query reports/complaints about this user
    // This would depend on your Rhizome schema
    return [];
  }

  private determineSafetyAction(
    trustSafety: TrustSafetyState,
    reports: any[]
  ): { type: SafetyAction["action"]; reason: string } | null {
    // Safety logic based on trust/safety state and reports
    // Note: Adjust property access based on actual TrustSafetyState structure
    
    // Access risk indicators - adjust property names based on actual API
    const riskLevel = (trustSafety as any).riskScore ?? (trustSafety as any).riskLevel ?? 0;
    const trustScore = (trustSafety as any).trustScore ?? 1.0;

    // Example: Low trust score triggers ban
    if (trustScore < 0.1) {
      return {
        type: "ban",
        reason: `Low trust score: ${trustScore}`,
      };
    }

    // Example: Multiple reports trigger verification
    if (reports.length >= 3) {
      return {
        type: "require_verification",
        reason: `Multiple reports: ${reports.length}`,
      };
    }

    // Example: Moderate risk limits matches
    if (riskLevel > 0.6 || trustScore < 0.4) {
      return {
        type: "limit_matches",
        reason: `Risk indicators detected`,
      };
    }

    // Example: Warning for low-level issues
    if ((riskLevel > 0.4 || trustScore < 0.6) && reports.length > 0) {
      return {
        type: "warn",
        reason: `Risk indicators detected`,
      };
    }

    return null;
  }
}

