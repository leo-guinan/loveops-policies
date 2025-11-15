#!/usr/bin/env node
/**
 * CLI entry point for running workflows
 * Usage:
 *   node dist/cli.js matching-tick [rhizome-config]
 *   node dist/cli.js daily-maintenance [rhizome-config]
 */

import { runMatchingTick } from "../workflows/runMatchingTick";
import { runDailyMaintenance } from "../workflows/runDailyMaintenance";

const command = process.argv[2];

async function main() {
  // In production, you'd load your rhizome client from config
  // For now, this is a placeholder - users should override CMD in Docker
  const rhizomeClient = process.env.RHIZOME_CLIENT 
    ? JSON.parse(process.env.RHIZOME_CLIENT)
    : null;

  if (!rhizomeClient) {
    console.error("Error: RHIZOME_CLIENT environment variable must be set");
    console.error("Or override CMD in Docker to run workflows directly");
    process.exit(1);
  }

  switch (command) {
    case "matching-tick":
      await runMatchingTick(rhizomeClient);
      break;
    case "daily-maintenance":
      await runDailyMaintenance(rhizomeClient);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: node dist/cli.js [matching-tick|daily-maintenance]");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

