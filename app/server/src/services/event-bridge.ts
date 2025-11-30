// Event Bridge - Connects GameEngine events to SSE broadcast
// Listens to GameEngine EventEmitter and broadcasts to connected SSE clients

import pino from 'pino';
import { getGameEngine, type GameEvent } from './game-engine.js';
import type { SSEResponse } from '../middleware/sse.js';
import type {
  ArenaEventType,
  StateSnapshotEvent,
  StateSnapshotModel,
} from '@sabe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

/** Set of connected SSE clients */
const clients: Set<SSEResponse> = new Set();

/** Heartbeat interval reference */
let heartbeatInterval: NodeJS.Timeout | null = null;

/** Heartbeat interval in milliseconds (30 seconds) */
const HEARTBEAT_INTERVAL = 30000;

/**
 * Add a client to the broadcast set
 */
export function addClient(client: SSEResponse): void {
  clients.add(client);
  logger.debug({ clientCount: clients.size }, 'SSE client connected');
}

/**
 * Remove a client from the broadcast set
 */
export function removeClient(client: SSEResponse): void {
  clients.delete(client);
  logger.debug({ clientCount: clients.size }, 'SSE client disconnected');
}

/**
 * Get number of connected clients
 */
export function getClientCount(): number {
  return clients.size;
}

// =============================================================================
// BROADCASTING
// =============================================================================

/**
 * Broadcast an event to all connected SSE clients
 */
export function broadcastEvent(eventType: string, data: unknown): void {
  for (const client of clients) {
    try {
      client.sse.send(eventType, data);
    } catch {
      // Client disconnected, remove from set
      clients.delete(client);
    }
  }

  logger.debug(
    { eventType, clientCount: clients.size },
    'Broadcast event to SSE clients'
  );
}

/**
 * Send current state snapshot to a specific client
 */
export async function sendStateSnapshot(client: SSEResponse): Promise<void> {
  const engine = getGameEngine();
  const state = await engine.getCurrentState();

  const snapshot: StateSnapshotEvent = {
    type: 'state_snapshot',
    timestamp: new Date().toISOString(),
    session: state?.session
      ? {
          id: state.session.id,
          status: state.session.status,
          totalRounds: state.session.totalRounds,
          completedRounds: state.session.completedRounds,
          currentRoundId: state.session.currentRoundId,
        }
      : null,
    currentRound: state?.currentRound
      ? {
          id: state.currentRound.id,
          roundNumber: state.currentRound.roundNumber,
          status: state.currentRound.status,
          masterId: state.currentRound.masterId,
          masterName: state.currentRound.masterName,
          topicId: state.currentRound.topicId,
          topicName: state.currentRound.topicName,
          questionContent: state.currentRound.questionContent,
          questionDifficulty: state.currentRound.questionDifficulty,
        }
      : null,
    currentStep: state?.currentStep
      ? {
          id: state.currentStep.id,
          stepType: state.currentStep.stepType,
          status: state.currentStep.status,
          actorModelId: state.currentStep.actorModelId,
          actorModelName: state.currentStep.actorModelName,
        }
      : null,
    models: state?.models?.map((m): StateSnapshotModel => ({
      id: m.id,
      displayName: m.displayName,
      status: m.status,
      hasAnswered: m.hasAnswered,
      hasJudged: m.hasJudged,
    })) ?? [],
  };

  try {
    client.sse.send('state_snapshot', snapshot);
  } catch {
    // Client likely disconnected
    clients.delete(client);
  }
}

// =============================================================================
// EVENT MAPPING
// =============================================================================

/**
 * Map internal GameEngine event types to SSE event names
 */
function mapEventName(internalType: string): ArenaEventType {
  const mapping: Record<string, ArenaEventType> = {
    session_created: 'session:created',
    session_started: 'session:started',
    session_paused: 'session:paused',
    session_completed: 'session:completed',
    session_ended: 'session:ended',
    session_failed: 'session:failed',
    round_started: 'round:started',
    round_completed: 'round:completed',
    step_started: 'step:started',
    step_completed: 'step:completed',
    step_undone: 'step:undone',
  };

  return mapping[internalType] ?? (internalType as ArenaEventType);
}

// =============================================================================
// HEARTBEAT
// =============================================================================

/**
 * Start the heartbeat interval
 * Sends periodic comments to keep connections alive
 */
function startHeartbeat(): void {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      try {
        client.sse.sendComment('heartbeat');
      } catch {
        // Client disconnected
        clients.delete(client);
      }
    }
  }, HEARTBEAT_INTERVAL);

  logger.debug('SSE heartbeat started');
}

/**
 * Stop the heartbeat interval
 */
function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    logger.debug('SSE heartbeat stopped');
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/** Track initialization state */
let isInitialized = false;

/**
 * Broadcast a fresh state snapshot to all connected clients
 * Used when session state changes significantly (create, end)
 */
export async function broadcastStateSnapshot(): Promise<void> {
  const engine = getGameEngine();
  const state = await engine.getCurrentState();

  const snapshot: StateSnapshotEvent = {
    type: 'state_snapshot',
    timestamp: new Date().toISOString(),
    session: state?.session
      ? {
          id: state.session.id,
          status: state.session.status,
          totalRounds: state.session.totalRounds,
          completedRounds: state.session.completedRounds,
          currentRoundId: state.session.currentRoundId,
        }
      : null,
    currentRound: state?.currentRound
      ? {
          id: state.currentRound.id,
          roundNumber: state.currentRound.roundNumber,
          status: state.currentRound.status,
          masterId: state.currentRound.masterId,
          masterName: state.currentRound.masterName,
          topicId: state.currentRound.topicId,
          topicName: state.currentRound.topicName,
          questionContent: state.currentRound.questionContent,
          questionDifficulty: state.currentRound.questionDifficulty,
        }
      : null,
    currentStep: state?.currentStep
      ? {
          id: state.currentStep.id,
          stepType: state.currentStep.stepType,
          status: state.currentStep.status,
          actorModelId: state.currentStep.actorModelId,
          actorModelName: state.currentStep.actorModelName,
        }
      : null,
    models: state?.models?.map((m): StateSnapshotModel => ({
      id: m.id,
      displayName: m.displayName,
      status: m.status,
      hasAnswered: m.hasAnswered,
      hasJudged: m.hasJudged,
    })) ?? [],
  };

  broadcastEvent('state_snapshot', snapshot);
  logger.debug({ clientCount: clients.size }, 'Broadcast state snapshot to all clients');
}

/**
 * Initialize the event bridge
 * Call this once at server startup
 */
export function initializeEventBridge(): void {
  if (isInitialized) {
    logger.warn('Event bridge already initialized');
    return;
  }

  const engine = getGameEngine();

  // Listen to all game engine events
  engine.on('event', async (event: GameEvent) => {
    const sseEventName = mapEventName(event.type);

    logger.debug(
      { internalType: event.type, sseEventName },
      'Bridging game event to SSE'
    );

    // Add timestamp if not present
    const eventData = {
      ...event,
      type: sseEventName,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    // Broadcast to all connected clients
    broadcastEvent(sseEventName, eventData);

    // For session creation/end events, also broadcast a full state snapshot
    // so clients can reset their local state completely
    if (event.type === 'session_created' || event.type === 'session_ended') {
      await broadcastStateSnapshot();
    }
  });

  // Start heartbeat
  startHeartbeat();

  isInitialized = true;
  logger.info('Event bridge initialized');
}

/**
 * Cleanup the event bridge (for graceful shutdown)
 */
export function cleanupEventBridge(): void {
  stopHeartbeat();

  // Close all client connections
  for (const client of clients) {
    try {
      client.end();
    } catch {
      // Ignore errors during cleanup
    }
  }
  clients.clear();

  isInitialized = false;
  logger.info('Event bridge cleaned up');
}
