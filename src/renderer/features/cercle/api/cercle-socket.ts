import {
    cercleRequest,
    getCercleContext,
    getCercleToken,
    getCercleWsUrl,
} from '/@/renderer/features/cercle/api/cercle-client';
import { CercleWsMessage } from '/@/renderer/features/cercle/api/cercle-types';
import { useCercleStore } from '/@/renderer/features/cercle/store/cercle-store';
import { logger } from '/@/renderer/utils/logger';

type Listener = (message: CercleWsMessage) => void;

const PING_INTERVAL_MS = 25 * 1000;
const MAX_BACKOFF_MS = 30 * 1000;

// One shared connection per app. Reconnects with jittered exponential backoff and
// re-validates the token over REST (which re-logs in on 401) when the socket is refused.
class CercleSocket {
    private attempts = 0;
    private generation = 0;
    private listeners = new Set<Listener>();
    private pingTimer: null | ReturnType<typeof setInterval> = null;
    private reconnectTimer: null | ReturnType<typeof setTimeout> = null;
    // Ref-counted: the room page and the sync hook may both watch the same room.
    private rooms = new Map<string, number>();
    private running = false;
    private ws: null | WebSocket = null;

    send(type: string, data: Record<string, unknown> = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ data, type }));
        }
    }

    start() {
        if (this.running) {
            return;
        }

        this.running = true;
        this.attempts = 0;
        void this.connect();
    }

    stop() {
        this.running = false;
        this.generation += 1;
        this.clearTimers();

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }

        useCercleStore.getState().actions.setConnection('idle');
    }

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    subscribeRoom(roomId: string) {
        const count = this.rooms.get(roomId) || 0;
        this.rooms.set(roomId, count + 1);
        if (count === 0) {
            this.send('subscribe_room', { room_id: roomId });
        }
    }

    unsubscribeRoom(roomId: string) {
        const count = this.rooms.get(roomId) || 0;
        if (count <= 1) {
            this.rooms.delete(roomId);
            this.send('unsubscribe_room', { room_id: roomId });
        } else {
            this.rooms.set(roomId, count - 1);
        }
    }

    private clearTimers() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private async connect() {
        const generation = this.generation;
        const { setConnection } = useCercleStore.getState().actions;

        let ctx: ReturnType<typeof getCercleContext>;
        try {
            ctx = getCercleContext();
        } catch {
            // No usable server/hub: stay idle until the hook restarts us.
            setConnection('idle');
            this.running = false;
            return;
        }

        setConnection('connecting');

        let token: string;
        try {
            token = await getCercleToken(ctx);
        } catch (error) {
            logger.warn('Cercle socket could not get a session', { error });
            this.scheduleReconnect(generation);
            return;
        }

        if (generation !== this.generation || !this.running) {
            return;
        }

        let opened = false;
        const ws = new WebSocket(getCercleWsUrl(ctx, token));
        this.ws = ws;

        ws.onopen = () => {
            opened = true;
            this.attempts = 0;
            setConnection('open');
            logger.info('Cercle socket connected');
            this.rooms.forEach((_count, roomId) =>
                this.send('subscribe_room', { room_id: roomId }),
            );
            this.pingTimer = setInterval(() => this.send('ping'), PING_INTERVAL_MS);
        };

        ws.onmessage = (event) => {
            let message: CercleWsMessage;
            try {
                message = JSON.parse(String(event.data));
            } catch {
                return;
            }

            this.listeners.forEach((listener) => {
                try {
                    listener(message);
                } catch (error) {
                    logger.error('Cercle socket listener failed', { error, type: message.type });
                }
            });
        };

        ws.onclose = () => {
            if (this.pingTimer) {
                clearInterval(this.pingTimer);
                this.pingTimer = null;
            }

            this.ws = null;
            if (!this.running || generation !== this.generation) {
                return;
            }

            setConnection('closed');

            if (!opened) {
                // Browsers hide the handshake status. Probe REST: a 401 there clears the
                // stale token and logs in again, so the next attempt uses a fresh one.
                cercleRequest('GET', '/me')
                    .catch(() => undefined)
                    .finally(() => this.scheduleReconnect(generation));
                return;
            }

            this.scheduleReconnect(generation);
        };
    }

    private scheduleReconnect(generation: number) {
        if (!this.running || generation !== this.generation) {
            return;
        }

        const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempts);
        const delay = Math.round(base / 2 + (Math.random() * base) / 2);
        this.attempts += 1;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect();
        }, delay);
    }
}

export const cercleSocket = new CercleSocket();
