// Server-Sent Events middleware
// Sets up proper headers and provides helper methods for SSE streaming

import type { Request, Response, NextFunction } from 'express';

/**
 * Extended Response type with SSE helper methods
 */
export interface SSEResponse extends Response {
  sse: {
    /**
     * Send an SSE event to the client
     * @param event - Event name (e.g., 'state_snapshot', 'step:completed')
     * @param data - Event data (will be JSON stringified)
     */
    send: (event: string, data: unknown) => void;

    /**
     * Send a comment (useful for keepalive/heartbeat)
     * SSE comments start with ':' and are ignored by EventSource
     */
    sendComment: (comment: string) => void;
  };
}

/**
 * SSE middleware - sets headers and adds helper methods
 * Use this middleware on routes that need to stream events
 */
export function sseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set SSE-specific headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Disable compression for SSE (can cause buffering issues)
  res.setHeader('Content-Encoding', 'identity');

  // CORS headers (if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Flush headers immediately to establish connection
  res.flushHeaders();

  // Cast to SSEResponse and add helper methods
  const sseRes = res as SSEResponse;
  sseRes.sse = {
    send: (event: string, data: unknown) => {
      try {
        // SSE format: event: eventname\ndata: jsondata\n\n
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client likely disconnected, ignore
      }
    },

    sendComment: (comment: string) => {
      try {
        // SSE comments start with ':' - used for keepalive
        res.write(`: ${comment}\n\n`);
      } catch {
        // Client likely disconnected, ignore
      }
    },
  };

  // Handle client disconnect
  req.on('close', () => {
    res.end();
  });

  next();
}
