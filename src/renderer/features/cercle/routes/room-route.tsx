import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import styles from './cercle-routes.module.css';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    applyCercleMessage,
    removeRoomRequest,
    upsertRoom,
} from '/@/renderer/features/cercle/api/cercle-cache';
import { cercleSocket } from '/@/renderer/features/cercle/api/cercle-socket';
import { songToCercleTrack } from '/@/renderer/features/cercle/api/cercle-songs';
import { CercleRoomDetail, CercleRoomRequest } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import {
    CercleCard,
    CerclePage,
    CercleSection,
} from '/@/renderer/features/cercle/components/cercle-page';
import { confirmCercleAction } from '/@/renderer/features/cercle/components/confirm';
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { useCerclePlay } from '/@/renderer/features/cercle/hooks/use-cercle-play';
import {
    useCercleActiveRoom,
    useCercleStore,
} from '/@/renderer/features/cercle/store/cercle-store';
import { formatClock, useNow } from '/@/renderer/features/cercle/utils/cercle-format';
import { useCurrentServer } from '/@/renderer/store/auth.store';
import { formatDateRelative } from '/@/renderer/utils/format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';

const NowPlaying = ({ room }: { room: CercleRoomDetail }) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const now = useNow(1000);
    const trackId = room.state.track_id;

    const song = useQuery({
        enabled: Boolean(trackId && server?.id),
        queryFn: ({ signal }) =>
            api.controller.getSongDetail({
                apiClientProps: { serverId: server?.id || '', signal },
                query: { id: trackId || '' },
            }),
        queryKey: queryKeys.songs.detail(server?.id || '', { id: trackId || '' }),
        staleTime: 5 * 60 * 1000,
    });

    if (!trackId) {
        return (
            <CercleCard>
                <Text isMuted size="sm">
                    {t('cercle.rooms.nothingPlaying')}
                </Text>
            </CercleCard>
        );
    }

    const elapsed = room.state.playing ? Math.max(0, now - Date.parse(room.state.updated_at)) : 0;
    const durationMs = song.data?.duration || 0;
    const position = Math.min(room.state.position_ms + elapsed, durationMs || Infinity);

    return (
        <CercleCard>
            <div className={styles.hero}>
                <CoverArt id={song.data?.albumId} size={120} />
                <div className={styles.grow}>
                    <Group gap="xs">
                        <Badge variant={room.state.playing ? 'filled' : 'outline'}>
                            {room.state.playing
                                ? t('cercle.rooms.playing')
                                : t('cercle.rooms.paused')}
                        </Badge>
                    </Group>
                    <Text fw={700} overflow="hidden" size="xl">
                        {song.data?.name || (song.isError ? t('cercle.rooms.trackMissing') : '...')}
                    </Text>
                    <Text isMuted overflow="hidden" size="sm">
                        {song.data ? `${song.data.artistName} - ${song.data.album || ''}` : ''}
                    </Text>
                    <Text isMuted size="xs">
                        {formatClock(position)}
                        {durationMs ? ` / ${formatClock(durationMs)}` : ''}
                    </Text>
                </div>
            </div>
        </CercleCard>
    );
};

const RequestSearch = ({ roomId }: { roomId: string }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const server = useCurrentServer();
    const [term, setTerm] = useState('');
    const [debounced] = useDebouncedValue(term.trim(), 350);

    const results = useQuery({
        enabled: Boolean(debounced && debounced.length >= 2 && server?.id),
        queryFn: ({ signal }) =>
            api.controller.search({
                apiClientProps: { serverId: server?.id || '', signal },
                query: { albumArtistLimit: 0, albumLimit: 0, query: debounced || '', songLimit: 8 },
            }),
        queryKey: ['cercle', 'request-search', server?.id || '', debounced || ''],
        staleTime: 60 * 1000,
    });

    const add = useMutation({
        mutationFn: (track: ReturnType<typeof songToCercleTrack>) =>
            cercleApi.addRequest(roomId, track),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (request) => {
            applyCercleMessage(queryClient, {
                data: { request, room_id: roomId },
                type: 'room_request',
            });
            toast.success({ message: t('cercle.rooms.requestSent') });
            setTerm('');
        },
    });

    return (
        <div className={styles.list}>
            <TextInput
                aria-label={t('cercle.rooms.requestSearch')}
                leftSection={<Icon icon="search" />}
                onChange={(e) => setTerm(e.currentTarget.value)}
                placeholder={t('cercle.rooms.requestSearch')}
                value={term}
            />
            {term.trim().length >= 2
                ? (results.data?.songs || []).map((song) => (
                      <div className={styles.listRow} key={song.id}>
                          <CoverArt id={song.albumId} size={36} />
                          <div className={styles.grow}>
                              <Text fw={500} overflow="hidden" size="sm">
                                  {song.name}
                              </Text>
                              <Text isMuted overflow="hidden" size="xs">
                                  {song.artistName}
                              </Text>
                          </div>
                          <Button
                              loading={add.isPending && add.variables?.id === song.id}
                              onClick={() => add.mutate(songToCercleTrack(song))}
                              size="compact-sm"
                              variant="default"
                          >
                              {t('cercle.rooms.request')}
                          </Button>
                      </div>
                  ))
                : null}
        </div>
    );
};

const RequestRow = ({
    isHost,
    request,
    roomId,
}: {
    isHost: boolean;
    request: CercleRoomRequest;
    roomId: string;
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const server = useCurrentServer();
    const { playNext } = useCerclePlay();
    const canDelete = isHost || request.user.username === server?.username;

    const remove = useMutation({
        mutationFn: () => cercleApi.deleteRequest(roomId, request.id),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => removeRoomRequest(queryClient, roomId, request.id),
    });

    return (
        <div className={styles.listRow}>
            <CoverArt id={request.track.album_id} size={36} />
            <div className={styles.grow}>
                <Text fw={500} overflow="hidden" size="sm">
                    {request.track.title}
                </Text>
                <Text isMuted overflow="hidden" size="xs">
                    {t('cercle.rooms.requestedBy', {
                        artist: request.track.artist,
                        name: request.user.display_name,
                    })}
                    {' - '}
                    {formatDateRelative(request.created_at)}
                </Text>
            </div>
            {isHost ? (
                <Button
                    leftSection={<Icon icon="mediaPlayNext" />}
                    onClick={() => {
                        playNext(request.track.id);
                        remove.mutate();
                    }}
                    size="compact-sm"
                    variant="default"
                >
                    {t('cercle.rooms.playNext')}
                </Button>
            ) : null}
            {canDelete ? (
                <ActionIcon
                    aria-label={t('cercle.common.delete')}
                    icon="x"
                    loading={remove.isPending}
                    onClick={() => remove.mutate()}
                    variant="subtle"
                />
            ) : null}
        </div>
    );
};

const RoomContent = () => {
    const { t } = useTranslation();
    const { roomId = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const server = useCurrentServer();
    const activeRoom = useCercleActiveRoom();
    const { setActiveRoom } = useCercleStore((state) => state.actions);
    const room = useQuery(cercleQueries.room(roomId));
    const myUsername = server?.username;
    const isMember = Boolean(
        room.data &&
        (room.data.host.username === myUsername ||
            room.data.listeners.some((l) => l.username === myUsername)),
    );

    // Live room events while this page is open, even when not following.
    useEffect(() => {
        if (!isMember) {
            return undefined;
        }
        cercleSocket.subscribeRoom(roomId);
        return () => cercleSocket.unsubscribeRoom(roomId);
    }, [isMember, roomId]);

    const onError = (error: unknown) => toast.error({ message: getCercleErrorMessage(error, t) });

    const join = useMutation({
        mutationFn: () => cercleApi.joinRoom(roomId),
        onError,
        onSuccess: (updated) => {
            upsertRoom(queryClient, updated);
            setActiveRoom({ id: roomId, role: 'listener' });
        },
    });

    const leave = useMutation({
        mutationFn: () => cercleApi.leaveRoom(roomId),
        onError,
        onSuccess: () => {
            if (activeRoom?.id === roomId) {
                setActiveRoom(null);
            }
            void queryClient.invalidateQueries({ queryKey: cercleKeys.rooms() });
            navigate(
                `/cercle/rooms${room.data ? `?circle=${encodeURIComponent(room.data.circle_id)}` : ''}`,
            );
        },
    });

    const close = useMutation({
        mutationFn: () => cercleApi.closeRoom(roomId),
        onError,
        onSuccess: () => {
            setActiveRoom(null);
            void queryClient.invalidateQueries({ queryKey: cercleKeys.rooms() });
            navigate('/cercle/rooms');
        },
    });

    const handOver = useMutation({
        mutationFn: (username: string) => cercleApi.setHost(roomId, username),
        onError,
        onSuccess: (updated) => {
            upsertRoom(queryClient, updated);
            setActiveRoom({ id: roomId, role: 'listener' });
        },
    });

    if (room.isPending) {
        return <CercleSkeleton count={3} height={120} />;
    }

    if (room.isError) {
        return (
            <EmptyState
                action={
                    <Button component={Link} to="/cercle/rooms" variant="default">
                        {t('cercle.nav.rooms')}
                    </Button>
                }
                icon="headphones"
                message={getCercleErrorMessage(room.error, t)}
                title={t('cercle.rooms.gone')}
            />
        );
    }

    const data = room.data;
    const me = server?.username;
    const isHost = data.host.username === me;
    const isListener = data.listeners.some((l) => l.username === me);
    const attached = activeRoom?.id === roomId;

    return (
        <>
            <div className={styles.toolbar}>
                <div className={styles.grow}>
                    <Text fw={700} size="xl">
                        {data.name}
                    </Text>
                    <Group gap={6}>
                        <UserAvatar size={20} user={data.host} />
                        <Text isMuted size="sm">
                            {isHost
                                ? t('cercle.rooms.youHost')
                                : t('cercle.rooms.hostedBy', { name: data.host.display_name })}
                        </Text>
                    </Group>
                </div>
                <Group gap="xs">
                    {!isHost && !isListener ? (
                        <Button
                            leftSection={<Icon icon="headphones" />}
                            loading={join.isPending}
                            onClick={() => join.mutate()}
                            variant="filled"
                        >
                            {t('cercle.rooms.join')}
                        </Button>
                    ) : null}
                    {isListener && !isHost ? (
                        <Button
                            onClick={() =>
                                setActiveRoom(attached ? null : { id: roomId, role: 'listener' })
                            }
                            variant={attached ? 'default' : 'filled'}
                        >
                            {attached ? t('cercle.rooms.stopFollowing') : t('cercle.rooms.follow')}
                        </Button>
                    ) : null}
                    {isHost && !attached ? (
                        <Button
                            onClick={() => setActiveRoom({ id: roomId, role: 'host' })}
                            variant="filled"
                        >
                            {t('cercle.rooms.broadcast')}
                        </Button>
                    ) : null}
                    {isHost || isListener ? (
                        <Button
                            leftSection={<Icon icon="signOut" />}
                            loading={leave.isPending}
                            onClick={() => leave.mutate()}
                            variant="default"
                        >
                            {t('cercle.rooms.leave')}
                        </Button>
                    ) : null}
                    {isHost ? (
                        <Button
                            leftSection={<Icon icon="delete" />}
                            loading={close.isPending}
                            onClick={() =>
                                confirmCercleAction({
                                    confirmLabel: t('cercle.rooms.close'),
                                    message: t('cercle.rooms.closeConfirm'),
                                    onConfirm: () => close.mutate(),
                                    title: t('cercle.rooms.close'),
                                })
                            }
                            variant="state-error"
                        >
                            {t('cercle.rooms.close')}
                        </Button>
                    ) : null}
                </Group>
            </div>

            {attached ? (
                <Text isMuted size="sm">
                    {activeRoom?.role === 'host'
                        ? t('cercle.rooms.broadcasting')
                        : t('cercle.rooms.following')}
                </Text>
            ) : null}

            <NowPlaying room={data} />

            <CercleSection
                title={t('cercle.rooms.listenerCount', { count: data.listeners.length })}
            >
                <CercleCard>
                    {data.listeners.length === 0 ? (
                        <Text isMuted size="sm">
                            {t('cercle.rooms.noListeners')}
                        </Text>
                    ) : (
                        <div className={styles.list}>
                            {data.listeners.map((listener) => (
                                <div className={styles.listRow} key={listener.username}>
                                    <UserAvatar size={28} user={listener} />
                                    <Text className={styles.grow} size="sm">
                                        {listener.display_name}
                                    </Text>
                                    {isHost && listener.username !== me ? (
                                        <Button
                                            loading={
                                                handOver.isPending &&
                                                handOver.variables === listener.username
                                            }
                                            onClick={() => handOver.mutate(listener.username)}
                                            size="compact-sm"
                                            variant="subtle"
                                        >
                                            {t('cercle.rooms.makeHost')}
                                        </Button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </CercleCard>
            </CercleSection>

            <CercleSection title={t('cercle.rooms.requests')}>
                <CercleCard>
                    {data.requests.length === 0 ? (
                        <Text isMuted size="sm">
                            {t('cercle.rooms.noRequests')}
                        </Text>
                    ) : (
                        <div className={styles.list}>
                            {data.requests.map((request) => (
                                <RequestRow
                                    isHost={isHost}
                                    key={request.id}
                                    request={request}
                                    roomId={roomId}
                                />
                            ))}
                        </div>
                    )}
                    {isHost || isListener ? <RequestSearch roomId={roomId} /> : null}
                </CercleCard>
            </CercleSection>
        </>
    );
};

const RoomRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.nav.rooms')}>
            <RoomContent />
        </CerclePage>
    );
};

export default RoomRoute;
