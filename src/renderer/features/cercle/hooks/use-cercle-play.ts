import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { cercleApi, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { fetchCercleSong } from '/@/renderer/features/cercle/api/cercle-songs';
import { CercleLive, CercleRoom } from '/@/renderer/features/cercle/api/cercle-types';
import { useCercleStore } from '/@/renderer/features/cercle/store/cercle-store';
import { livePositionMs } from '/@/renderer/features/cercle/utils/cercle-format';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCurrentServerId } from '/@/renderer/store/auth.store';
import { usePlayerActions } from '/@/renderer/store/player.store';
import { logger } from '/@/renderer/utils/logger';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

export const useCerclePlay = () => {
    const { t } = useTranslation();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const { setQueue } = usePlayerActions();
    const queryClient = useQueryClient();

    // fetchSongsByItemType has no SONG case, so single tracks go through song detail.
    const queueTrack = async (trackId: string, type: Play.NEXT | Play.NOW) => {
        if (!trackId) {
            return;
        }

        try {
            const song = await fetchCercleSong(queryClient, serverId, trackId);
            player.addToQueueByData(
                [song],
                type,
                type === Play.NOW ? song.id : undefined,
                null,
                true,
            );
        } catch (error) {
            logger.warn('Cercle track not playable on this server', { error });
            toast.error({ message: t('cercle.rooms.trackMissing') });
        }
    };

    const playTrack = (trackId: string) => void queueTrack(trackId, Play.NOW);

    const playNext = (trackId: string) => void queueTrack(trackId, Play.NEXT);

    const playAlbum = (albumId: string) => {
        if (albumId) {
            player.addToQueueByFetch(serverId, [albumId], LibraryItem.ALBUM, Play.NOW, {
                skipConfirmation: true,
            });
        }
    };

    const playAt = async (trackId: string, positionMs: number) => {
        try {
            const song = await fetchCercleSong(queryClient, serverId, trackId);
            setQueue([song], 0, positionMs / 1000);
        } catch (error) {
            logger.warn('Cercle track not playable on this server', { error });
            toast.error({ message: t('cercle.rooms.trackMissing') });
        }
    };

    return { playAlbum, playAt, playNext, playTrack };
};

// "Listen along": join the room this person is in, else play their track at their position.
export const useListenAlong = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { playAt } = useCerclePlay();

    const findRoom = async (username: string): Promise<CercleRoom | null> => {
        try {
            const circles = await queryClient.fetchQuery(cercleQueries.circles());
            const joined = circles.items.filter((circle) => circle.my_role !== null);
            const lists = await Promise.all(
                joined.map((circle) =>
                    queryClient
                        .fetchQuery(cercleQueries.rooms(circle.id))
                        .catch(() => ({ items: [] as CercleRoom[] })),
                ),
            );
            const rooms = lists.flatMap((list) => list.items);
            return (
                rooms.find((room) => room.host.username === username) ||
                rooms.find((room) => room.listeners.some((l) => l.username === username)) ||
                null
            );
        } catch {
            return null;
        }
    };

    return async (live: CercleLive) => {
        const room = await findRoom(live.user.username);

        if (room) {
            try {
                await cercleApi.joinRoom(room.id);
                useCercleStore.getState().actions.setActiveRoom({ id: room.id, role: 'listener' });
                toast.success({ message: t('cercle.rooms.joined', { name: room.name }) });
                navigate(`/cercle/rooms/${room.id}`);
                return;
            } catch (error) {
                logger.warn('Cercle room join failed, falling back to track', { error });
            }
        }

        await playAt(live.track.id, livePositionMs(live, Date.now()));
    };
};
