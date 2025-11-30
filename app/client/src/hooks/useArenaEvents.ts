// Custom hook for Arena SSE events
// Handles connection, reconnection, and event dispatching

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ArenaEvent,
  StateSnapshotEvent,
  SessionStartedEvent,
  RoundStartedEvent,
  RoundCompletedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  SessionCompletedEvent,
} from '@sabe/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface UseArenaEventsOptions {
  /** Called when initial state snapshot is received */
  onStateSnapshot?: (data: StateSnapshotEvent) => void;

  /** Called when a new session starts */
  onSessionStarted?: (data: SessionStartedEvent) => void;

  /** Called when a new round starts */
  onRoundStarted?: (data: RoundStartedEvent) => void;

  /** Called when a step starts (model is thinking) */
  onStepStarted?: (data: StepStartedEvent) => void;

  /** Called when a step completes */
  onStepCompleted?: (data: StepCompletedEvent) => void;

  /** Called when a round completes with scores */
  onRoundCompleted?: (data: RoundCompletedEvent) => void;

  /** Called when session completes */
  onSessionCompleted?: (data: SessionCompletedEvent) => void;

  /** Called on any event (for logging/debugging) */
  onAnyEvent?: (data: ArenaEvent) => void;

  /** Disable auto-connect (for testing) */
  disabled?: boolean;
}

export interface UseArenaEventsReturn {
  /** Whether SSE connection is open */
  isConnected: boolean;

  /** Manually reconnect */
  reconnect: () => void;

  /** Time since last event (ms) */
  timeSinceLastEvent: number;

  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useArenaEvents(
  options: UseArenaEventsOptions = {}
): UseArenaEventsReturn {
  const {
    onStateSnapshot,
    onSessionStarted,
    onRoundStarted,
    onStepStarted,
    onStepCompleted,
    onRoundCompleted,
    onSessionCompleted,
    onAnyEvent,
    disabled = false,
  } = options;

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const lastEventTimeRef = useRef(Date.now());

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [timeSinceLastEvent, setTimeSinceLastEvent] = useState(0);

  // Store callbacks in refs to avoid reconnection on callback change
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  /**
   * Invalidate TanStack Query caches based on event type
   */
  const invalidateQueries = useCallback((eventType: string) => {
    switch (eventType) {
      case 'session:created':
      case 'session:started':
      case 'session:completed':
      case 'session:failed':
        queryClient.invalidateQueries({ queryKey: ['arena', 'sessions'] });
        queryClient.invalidateQueries({ queryKey: ['arena', 'current'] });
        break;

      case 'round:started':
      case 'round:completed':
        queryClient.invalidateQueries({ queryKey: ['arena', 'current'] });
        queryClient.invalidateQueries({ queryKey: ['arena', 'rounds'] });
        break;

      case 'step:started':
      case 'step:completed':
        queryClient.invalidateQueries({ queryKey: ['arena', 'current'] });
        break;

      case 'state_snapshot':
        // Full state received, invalidate everything
        queryClient.invalidateQueries({ queryKey: ['arena'] });
        break;
    }
  }, [queryClient]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (disabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const eventSource = new EventSource('/api/arena/events');
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      lastEventTimeRef.current = Date.now();
    };

    // Connection error - attempt reconnect with exponential backoff
    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttemptsRef.current),
        30000
      );
      reconnectAttemptsRef.current++;
      setReconnectAttempts(reconnectAttemptsRef.current);

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    // Generic message handler (fallback)
    eventSource.onmessage = () => {
      lastEventTimeRef.current = Date.now();
    };

    // Event-specific handlers
    const addEventHandler = <T extends ArenaEvent>(
      event: string,
      handler?: (data: T) => void
    ) => {
      eventSource.addEventListener(event, (e: MessageEvent) => {
        lastEventTimeRef.current = Date.now();

        try {
          const data = JSON.parse(e.data) as T;

          // Call specific handler
          handler?.(data);

          // Call generic handler
          callbacksRef.current.onAnyEvent?.(data);

          // Invalidate queries
          invalidateQueries(event);
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      });
    };

    // Register handlers - use refs to avoid recreating connection on callback change
    addEventHandler('connected', () => {
      // Connection confirmed by server
    });
    addEventHandler<StateSnapshotEvent>('state_snapshot', (data) => {
      callbacksRef.current.onStateSnapshot?.(data);
    });
    addEventHandler<SessionStartedEvent>('session:started', (data) => {
      callbacksRef.current.onSessionStarted?.(data);
    });
    addEventHandler<RoundStartedEvent>('round:started', (data) => {
      callbacksRef.current.onRoundStarted?.(data);
    });
    addEventHandler<StepStartedEvent>('step:started', (data) => {
      callbacksRef.current.onStepStarted?.(data);
    });
    addEventHandler<StepCompletedEvent>('step:completed', (data) => {
      callbacksRef.current.onStepCompleted?.(data);
    });
    addEventHandler<RoundCompletedEvent>('round:completed', (data) => {
      callbacksRef.current.onRoundCompleted?.(data);
    });
    addEventHandler<SessionCompletedEvent>('session:completed', (data) => {
      callbacksRef.current.onSessionCompleted?.(data);
    });

  }, [disabled, invalidateQueries]);

  /**
   * Setup connection and cleanup
   */
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  /**
   * Handle tab visibility changes - reconnect when tab becomes visible
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect if connection was closed
        if (
          eventSourceRef.current?.readyState === EventSource.CLOSED ||
          !eventSourceRef.current
        ) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect]);

  /**
   * Stale connection detection - reconnect if no events for 60s
   */
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastEventTimeRef.current;
      setTimeSinceLastEvent(elapsed);

      // If no events for 60 seconds, connection may be stale
      if (elapsed > 60000 && eventSourceRef.current) {
        console.warn('SSE connection appears stale, reconnecting...');
        connect();
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [connect]);

  return {
    isConnected,
    reconnect: connect,
    timeSinceLastEvent,
    reconnectAttempts,
  };
}
