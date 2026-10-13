import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import i18n from '/@/i18n/i18n';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { cercleApi, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { cercleSocket } from '/@/renderer/features/cercle/api/cercle-socket';
import { fetchCercleSong } from '/@/renderer/features/cercle/api/cercle-songs';
import { CercleRoomState } from '/@/renderer/features/cercle/api/cercle-types';
import {
    useCercleActiveRoom,
    useCercleStore,
} from '/@/renderer/features/cercle/store/cercle-store';
import { useAuthStore } from '/@/renderer/store/auth.store';
import {
    subscribeCurrentTrack,
    subscribePlayerQueue,
    subscribePlayerStatus,
    usePlayerStoreBase,
} from '/@/renderer/store/player.store';
import { subscribePlayerProgress, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { logger } from '/@/renderer/utils/logger';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus } from '/@/shared/types/types';

const DRIFT_TOLERANCE_MS = 2000;
const HOST_HEARTBEAT_MS = 15 * 1000;
const QUEUE_LIMIT = 50;

const getMyUsername = () => useAuthStore.getState().currentServer?.username || '';

// Follows contract section 5: the host PUTs its state on every change and every 15 s
// while playing; listeners load, seek (drift > 2 s) and match play/pause.
export const useRoomSync = () => {
    const activeRoom = useCercleActiveRoom();
    const queryClient = useQueryClient();
    const roomId = activeRoom?.id;
    const role = activeRoom?.role;

    useEffect(() => {
        if (!roomId) {
            return undefined;
        }

        cercleSocket.subscribeRoom(roomId);

        // Swap roles when the host changes hands.
        const unsubscribe = cercleSocket.subscribe((message) => {
            if (message.type === 'room_update' && message.data.id === roomId) {
                const iAmHost = message.data.host.username === getMyUsername();
                const current = useCercleStore.getState().activeRoom;
                if (current && iAmHost !== (current.role === 'host')) {
                    useCercleStore
                        .getState()
                        .actions.setActiveRoom({ id: roomId, role: iAmHost ? 'host' : 'listener' });
                    if (iAmHost) {
                        toast.info({ message: i18n.t('cercle.rooms.youAreHost') });
                    }
                }
            }

            if (message.type === 'room_closed' && message.data.room_id === roomId) {
                useCercleStore.getState().actions.setActiveRoom(null);
                toast.info({ message: i18n.t('cercle.rooms.closed') });
            }
        });

        return () => {
            unsubscribe();
            cercleSocket.unsubscribeRoom(roomId);
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomId || role !== 'listener') {
            return undefined;
        }

        let lastSeq = -1;
        let lastState: CercleRoomState | null = null;
        let loadingTrackId: null | string = null;
        let missingTrackId: null | string = null;
        let cancelled = false;

        const targetPositionMs = (state: CercleRoomState) =>
            state.position_ms +
            (state.playing ? Math.max(0, Date.now() - Date.parse(state.updated_at)) : 0);

        const apply = async (state: CercleRoomState, isRecheck = false) => {
            if (!isRecheck) {
                if (state.seq <= lastSeq) {
                    return;
                }
                lastSeq = state.seq;
                lastState = state;
            }

            const player = usePlayerStoreBase.getState();
            const current = player.getCurrentSong();

            if (!state.track_id) {
                if (player.player.status === PlayerStatus.PLAYING) {
                    player.mediaPause();
                }
                return;
            }

            if (current?.id !== state.track_id) {
                if (loadingTrackId === state.track_id || missingTrackId === state.track_id) {
                    return;
                }

                const serverId = useAuthStore.getState().currentServer?.id;
                if (!serverId) {
                    return;
                }

                loadingTrackId = state.track_id;
                try {
                    const song = await fetchCercleSong(queryClient, serverId, state.track_id);
                    if (cancelled || lastState?.track_id !== state.track_id) {
                        return;
                    }

                    const latest = lastState || state;
                    player.setQueue([song], 0, targetPositionMs(latest) / 1000);
                    if (!latest.playing) {
                        setTimeout(() => usePlayerStoreBase.getState().mediaPause(), 250);
                    }
                } catch (error) {
                    missingTrackId = state.track_id;
                    logger.warn('Cercle room track not found on this server', { error });
                    toast.warn({ message: i18n.t('cercle.rooms.trackMissing') });
                } finally {
                    loadingTrackId = null;
                }
                return;
            }

            const target = targetPositionMs(state);
            const position = useTimestampStoreBase.getState().timestamp * 1000;
            if (Math.abs(position - target) > DRIFT_TOLERANCE_MS) {
                player.mediaSeekToTimestamp(target / 1000);
            }

            const status = usePlayerStoreBase.getState().player.status;
            if (state.playing && status !== PlayerStatus.PLAYING) {
                player.mediaPlay();
            } else if (!state.playing && status === PlayerStatus.PLAYING) {
                player.mediaPause();
            }
        };

        queryClient
            .fetchQuery(cercleQueries.room(roomId))
            .then((room) => apply(room.state))
            .catch((error) => logger.warn('Cercle room fetch failed', { error }));

        const unsubscribe = cercleSocket.subscribe((message) => {
            if (message.type === 'room_state' && message.data.room_id === roomId) {
                void apply(message.data.state);
            }
        });

        // Catch slow drift and missed messages between host heartbeats.
        const interval = setInterval(() => {
            if (lastState) {
                void apply(lastState, true);
            }
        }, 5000);

        return () => {
            cancelled = true;
            unsubscribe();
            clearInterval(interval);
        };
    }, [queryClient, roomId, role]);

    useEffect(() => {
        if (!roomId || role !== 'host') {
            return undefined;
        }

        let timer: null | ReturnType<typeof setTimeout> = null;

        const publishNow = () => {
            const player = usePlayerStoreBase.getState();
            const song = player.getCurrentSong();
            const queue = player.getQueue().items;
            const index = queue.findIndex((item) => item._uniqueId === song?._uniqueId);

            cercleApi
                .putRoomState(roomId, {
                    playing: player.player.status === PlayerStatus.PLAYING,
                    position_ms: Math.round(useTimestampStoreBase.getState().timestamp * 1000),
                    queue: queue.slice(index + 1, index + 1 + QUEUE_LIMIT).map((item) => item.id),
                    track_id: song?.id || null,
                })
                .catch((error) => logger.warn('Cercle room state publish failed', { error }));
        };

        const publish = () => {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(publishNow, 300);
        };

        const onSeek = () => publish();

        // Seeks from the seekbar also show up as progress jumps.
        const unsubscribeProgress = subscribePlayerProgress(({ timestamp }, prev) => {
            const delta = timestamp - prev.timestamp;
            if (delta < -1 || delta > 3) {
                publish();
            }
        });
        const unsubscribeTrack = subscribeCurrentTrack(publish);
        const unsubscribeStatus = subscribePlayerStatus(publish);
        const unsubscribeQueue = subscribePlayerQueue(publish);
        eventEmitter.on('PLAYER_SEEK_TO_TIMESTAMP', onSeek);

        const heartbeat = setInterval(() => {
            if (usePlayerStoreBase.getState().player.status === PlayerStatus.PLAYING) {
                publishNow();
            }
        }, HOST_HEARTBEAT_MS);

        publishNow();

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
            clearInterval(heartbeat);
            unsubscribeProgress();
            unsubscribeTrack();
            unsubscribeStatus();
            unsubscribeQueue();
            eventEmitter.off('PLAYER_SEEK_TO_TIMESTAMP', onSeek);
        };
    }, [roomId, role]);
};
