import {
  FactEvent,
  WorldViewParams,
  viewRegistry,
} from "loveops-world-model";

/**
 * Minimal adapter to:
 * - Fetch events for a user / pair of users
 * - Evaluate world views provided by loveops-world-model
 * - Append generated events back to the log
 */
export class LoveopsRhizomeClient {
  constructor(private rhizome: any) {} // inject underlying rhizome client

  async getEventsForUser(userId: string): Promise<FactEvent[]> {
    // query by actorId/targetId index (depends on Rhizome API)
    return this.rhizome.queryEvents({ userId });
  }

  async getEventsForPair(
    userId1: string,
    userId2: string
  ): Promise<FactEvent[]> {
    // query events involving both users
    return this.rhizome.queryEvents({
      userIds: [userId1, userId2],
    });
  }

  async queryCandidateUsers(userId: string): Promise<string[]> {
    // pseudo-code: probably another query to get potential matches
    return this.rhizome.queryCandidateUsers(userId);
  }

  async queryUsersNeedingMatches(): Promise<string[]> {
    // Expose rhizome method for workflows
    return this.rhizome.queryUsersNeedingMatches();
  }

  async queryActiveUsers(): Promise<string[]> {
    // Expose rhizome method for workflows
    return this.rhizome.queryActiveUsers();
  }

  async evalView<TState>(
    viewName: keyof typeof viewRegistry,
    events: FactEvent[],
    params?: WorldViewParams
  ): Promise<TState> {
    const viewFn = viewRegistry[viewName] as any;
    return viewFn(events, params);
  }

  async appendEvents(events: FactEvent[]): Promise<void> {
    await this.rhizome.appendEvents(events);
  }
}

