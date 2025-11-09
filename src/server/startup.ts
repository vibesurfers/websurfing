import { startBackgroundProcessor } from "./background-processor";

let isStarted = false;

export function startServerServices() {
  if (isStarted) {
    console.log('[Startup] Services already started');
    return;
  }

  console.log('[Startup] Starting background services...');

  startBackgroundProcessor();

  isStarted = true;
  console.log('[Startup] All services started');
}
