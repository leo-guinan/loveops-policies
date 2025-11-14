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
      "TrustSafetyStateView",
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
    const event = createDatingEvent({
      source: "system:safety",
      actorId: action.userId,
      targetId: action.userId, // self-action
      domain: "moderation",
      type: DatingEventType.MODERATION_ACTION_TAKEN,
      payload: {
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

    // Example: High risk score triggers ban
    if (trustSafety.riskScore > 0.9) {
      return {
        type: "ban",
        reason: `High risk score: ${trustSafety.riskScore}`,
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
    if (trustSafety.riskScore > 0.6) {
      return {
        type: "limit_matches",
        reason: `Moderate risk score: ${trustSafety.riskScore}`,
      };
    }

    // Example: Warning for low-level issues
    if (trustSafety.riskScore > 0.4 && reports.length > 0) {
      return {
        type: "warn",
        reason: `Risk indicators detected`,
      };
    }

    return null;
  }
}

