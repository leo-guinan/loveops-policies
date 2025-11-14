import { LoveopsRhizomeClient } from "../src/adapters/rhizome/LoveopsRhizomeClient";
import { MatchingEngine } from "../src/engines/matching/MatchingEngine";

/**
 * How a "tick" of matching works:
 * - Runs periodically (e.g., every hour)
 * - Processes users who need new matches
 * - Creates match events via MatchingEngine
 */
export async function runMatchingTick(
  rhizomeClient: any,
  userIds?: string[]
): Promise<void> {
  const client = new LoveopsRhizomeClient(rhizomeClient);
  const matchingEngine = new MatchingEngine(client);

  // If specific users provided, process only those
  // Otherwise, query for users who need matches
  const usersToProcess =
    userIds || (await client.rhizome.queryUsersNeedingMatches());

  console.log(`Running matching tick for ${usersToProcess.length} users`);

  for (const userId of usersToProcess) {
    try {
      const matches = await matchingEngine.createMatchEvents(userId, 3);
      console.log(
        `Created ${matches.length} matches for user ${userId}`
      );
    } catch (error) {
      console.error(`Error processing matches for user ${userId}:`, error);
      // Continue processing other users even if one fails
    }
  }

  console.log("Matching tick completed");
}

