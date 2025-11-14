import { LoveopsRhizomeClient } from "../src/adapters/rhizome/LoveopsRhizomeClient";
import { SafetyEngine } from "../src/engines/safety/SafetyEngine";
import { PacingEngine } from "../src/engines/pacing/PacingEngine";

/**
 * Daily maintenance workflow:
 * - Evaluates safety for all active users
 * - Updates pacing recommendations
 * - Applies any necessary safety actions
 */
export async function runDailyMaintenance(rhizomeClient: any): Promise<void> {
  const client = new LoveopsRhizomeClient(rhizomeClient);
  const safetyEngine = new SafetyEngine(client);
  const pacingEngine = new PacingEngine(client);

  // Query all active users
  const activeUsers = await client.rhizome.queryActiveUsers();

  console.log(`Running daily maintenance for ${activeUsers.length} users`);

  for (const userId of activeUsers) {
    try {
      // 1. Evaluate safety
      const safetyAction = await safetyEngine.evaluateUserSafety(userId);
      if (safetyAction) {
        await safetyEngine.applySafetyAction(safetyAction);
        console.log(
          `Applied safety action ${safetyAction.action} for user ${userId}`
        );
      }

      // 2. Update pacing recommendation
      const pacingRec = await pacingEngine.recommendPacing(userId);
      console.log(
        `Updated pacing to ${pacingRec.recommendedRate} for user ${userId}`
      );
    } catch (error) {
      console.error(`Error processing user ${userId}:`, error);
      // Continue processing other users even if one fails
    }
  }

  console.log("Daily maintenance completed");
}

