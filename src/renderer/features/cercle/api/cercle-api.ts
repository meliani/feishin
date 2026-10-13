import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { CercleClientError, cercleRequest } from '/@/renderer/features/cercle/api/cercle-client';
import {
    CercleCircle,
    CercleCircleDetail,
    CercleCircleStats,
    CercleComment,
    CercleCompare,
    CercleFeedItem,
    CercleHidden,
    CercleHiddenKind,
    CercleInvite,
    CercleInvitePreview,
    CercleList,
    CercleLive,
    CercleMe,
    CercleMember,
    CerclePage,
    CerclePlay,
    CercleRange,
    CercleRole,
    CercleRoom,
    CercleRoomDetail,
    CercleRoomRequest,
    CercleRoomState,
    CercleRoomStateInput,
    CercleSettings,
    CercleSharing,
    CercleStats,
    CercleTrack,
    CercleUser,
    CercleUserDetail,
    CercleWrapped,
} from '/@/renderer/features/cercle/api/cercle-types';

const enc = encodeURIComponent;

export type CercleFeedFilter = { circle?: string; user?: string };

// All keys live under the 'cercle' root so a hub switch can drop them in one call.
export const cercleKeys = {
    all: ['cercle'] as const,
    circle: (id: string) => ['cercle', 'circles', id] as const,
    circles: () => ['cercle', 'circles'] as const,
    comments: (itemId: string) => ['cercle', 'comments', itemId] as const,
    compare: (username: string, range: CercleRange) =>
        ['cercle', 'compare', username, range] as const,
    feed: (filter?: CercleFeedFilter) =>
        filter ? (['cercle', 'feed', filter] as const) : (['cercle', 'feed'] as const),
    invite: (code: string) => ['cercle', 'invite', code] as const,
    invites: (circleId: string) => ['cercle', 'invites', circleId] as const,
    live: () => ['cercle', 'live'] as const,
    me: () => ['cercle', 'me'] as const,
    plays: (username: string) => ['cercle', 'plays', username] as const,
    room: (id: string) => ['cercle', 'room', id] as const,
    rooms: (circleId?: string) =>
        circleId ? (['cercle', 'rooms', circleId] as const) : (['cercle', 'rooms'] as const),
    stats: (scope: 'circle' | 'me' | 'user', id: string, range: CercleRange) =>
        ['cercle', 'stats', scope, id, range] as const,
    user: (username: string) => ['cercle', 'user', username] as const,
    users: () => ['cercle', 'users'] as const,
    wrapped: (year: number, username?: string) =>
        ['cercle', 'wrapped', year, username || ''] as const,
};

export const cercleApi = {
    acceptInvite: (code: string) =>
        cercleRequest<CercleCircle>('POST', `/invites/${enc(code)}/accept`),
    addHidden: (hidden: CercleHidden) =>
        cercleRequest<CercleSettings>('POST', '/me/hidden', { body: hidden }),
    addRequest: (roomId: string, track: CercleTrack) =>
        cercleRequest<CercleRoomRequest>('POST', `/rooms/${enc(roomId)}/requests`, {
            body: { track },
        }),
    closeRoom: (roomId: string) => cercleRequest<void>('DELETE', `/rooms/${enc(roomId)}`),
    createCircle: (body: { description?: string; name: string }) =>
        cercleRequest<CercleCircle>('POST', '/circles', { body }),
    createInvite: (circleId: string, body: { expires_in_hours?: number; max_uses?: number }) =>
        cercleRequest<CercleInvite>('POST', `/circles/${enc(circleId)}/invites`, { body }),
    createRoom: (circleId: string, name: string) =>
        cercleRequest<CercleRoom>('POST', `/circles/${enc(circleId)}/rooms`, { body: { name } }),
    deleteCircle: (circleId: string) => cercleRequest<void>('DELETE', `/circles/${enc(circleId)}`),
    deleteComment: (commentId: string) =>
        cercleRequest<void>('DELETE', `/comments/${enc(commentId)}`),
    deleteInvite: (circleId: string, code: string) =>
        cercleRequest<void>('DELETE', `/circles/${enc(circleId)}/invites/${enc(code)}`),
    deleteRequest: (roomId: string, requestId: string) =>
        cercleRequest<void>('DELETE', `/rooms/${enc(roomId)}/requests/${enc(requestId)}`),
    editComment: (commentId: string, body: string) =>
        cercleRequest<CercleComment>('PATCH', `/comments/${enc(commentId)}`, { body: { body } }),
    joinCircle: (circleId: string, code?: string) =>
        cercleRequest<CercleCircle>('POST', `/circles/${enc(circleId)}/join`, {
            body: code ? { code } : {},
        }),
    joinRoom: (roomId: string) => cercleRequest<CercleRoom>('POST', `/rooms/${enc(roomId)}/join`),
    leaveCircle: (circleId: string) =>
        cercleRequest<void>('POST', `/circles/${enc(circleId)}/leave`),
    leaveRoom: (roomId: string) => cercleRequest<void>('POST', `/rooms/${enc(roomId)}/leave`),
    pause: (minutes: number) =>
        cercleRequest<CercleSettings>('POST', '/me/pause', { body: { minutes } }),
    postComment: (itemId: string, body: string) =>
        cercleRequest<CercleComment>('POST', `/feed/${enc(itemId)}/comments`, { body: { body } }),
    putRoomState: (roomId: string, state: CercleRoomStateInput) =>
        cercleRequest<CercleRoomState>('PUT', `/rooms/${enc(roomId)}/state`, { body: state }),
    react: (itemId: string, emoji: string, on: boolean) =>
        cercleRequest<CercleFeedItem>(
            on ? 'PUT' : 'DELETE',
            `/feed/${enc(itemId)}/reactions/${enc(emoji)}`,
        ),
    removeHidden: (kind: CercleHiddenKind, id: string) =>
        cercleRequest<CercleSettings>('DELETE', `/me/hidden/${enc(kind)}/${enc(id)}`),
    removeMember: (circleId: string, username: string) =>
        cercleRequest<void>('DELETE', `/circles/${enc(circleId)}/members/${enc(username)}`),
    setHost: (roomId: string, username: string) =>
        cercleRequest<CercleRoom>('PUT', `/rooms/${enc(roomId)}/host`, { body: { username } }),
    setMemberRole: (circleId: string, username: string, role: CercleRole) =>
        cercleRequest<CercleMember>('PUT', `/circles/${enc(circleId)}/members/${enc(username)}`, {
            body: { role },
        }),
    setSharing: (circleId: string, sharing: Partial<CercleSharing>) =>
        cercleRequest<CercleSharing>('PUT', `/circles/${enc(circleId)}/sharing`, {
            body: sharing,
        }),
    updateCircle: (circleId: string, body: { description?: string; name?: string }) =>
        cercleRequest<CercleCircle>('PATCH', `/circles/${enc(circleId)}`, { body }),
    updateMe: (body: { display_name?: string }) =>
        cercleRequest<CercleMe>('PATCH', '/me', { body }),
    updateSettings: (body: { history_delay_minutes?: number; paused_until?: null | string }) =>
        cercleRequest<CercleSettings>('PUT', '/me/settings', { body }),
};

const STALE = 30 * 1000;

// Retry only transient failures; 4xx answers (forbidden, not found) are final.
const cercleRetry = (count: number, error: unknown) => {
    const status = (error as CercleClientError)?.status;
    return count < 2 && (!status || status >= 500);
};

export const cercleQueries = {
    circle: (id: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleCircleDetail>('GET', `/circles/${enc(id)}`, { signal }),
            queryKey: cercleKeys.circle(id),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    circles: () =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleCircle>>('GET', '/circles', { signal }),
            queryKey: cercleKeys.circles(),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    circleStats: (id: string, range: CercleRange) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleCircleStats>('GET', `/stats/circles/${enc(id)}`, {
                    params: { range },
                    signal,
                }),
            queryKey: cercleKeys.stats('circle', id, range),
            retry: cercleRetry,
            staleTime: 5 * 60 * 1000,
        }),
    comments: (itemId: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleComment>>('GET', `/feed/${enc(itemId)}/comments`, {
                    signal,
                }),
            queryKey: cercleKeys.comments(itemId),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    compare: (username: string, range: CercleRange) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleCompare>('GET', `/stats/compare/${enc(username)}`, {
                    params: { range },
                    signal,
                }),
            queryKey: cercleKeys.compare(username, range),
            retry: cercleRetry,
            staleTime: 5 * 60 * 1000,
        }),
    feed: (filter: CercleFeedFilter) =>
        infiniteQueryOptions({
            getNextPageParam: (lastPage: CerclePage<CercleFeedItem>) => lastPage.next || undefined,
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam, signal }) =>
                cercleRequest<CerclePage<CercleFeedItem>>('GET', '/feed', {
                    params: {
                        before: pageParam,
                        circle: filter.circle,
                        limit: 30,
                        user: filter.user,
                    },
                    signal,
                }),
            queryKey: cercleKeys.feed(filter),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    invite: (code: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleInvitePreview>('GET', `/invites/${enc(code)}`, { signal }),
            queryKey: cercleKeys.invite(code),
            retry: false,
        }),
    invites: (circleId: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleInvite>>(
                    'GET',
                    `/circles/${enc(circleId)}/invites`,
                    {
                        signal,
                    },
                ),
            queryKey: cercleKeys.invites(circleId),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    live: () =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleLive>>('GET', '/live', { signal }),
            queryKey: cercleKeys.live(),
            // The socket keeps this fresh; poll slowly as a fallback when it is down.
            refetchInterval: 60 * 1000,
            retry: cercleRetry,
            staleTime: STALE,
        }),
    me: () =>
        queryOptions({
            queryFn: ({ signal }) => cercleRequest<CercleMe>('GET', '/me', { signal }),
            queryKey: cercleKeys.me(),
            retry: 1,
            staleTime: 60 * 1000,
        }),
    plays: (username: string) =>
        infiniteQueryOptions({
            getNextPageParam: (lastPage: CerclePage<CerclePlay>) => lastPage.next || undefined,
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam, signal }) =>
                cercleRequest<CerclePage<CerclePlay>>('GET', `/users/${enc(username)}/plays`, {
                    params: { before: pageParam, limit: 50 },
                    signal,
                }),
            queryKey: cercleKeys.plays(username),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    room: (id: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleRoomDetail>('GET', `/rooms/${enc(id)}`, { signal }),
            queryKey: cercleKeys.room(id),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    rooms: (circleId: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleRoom>>('GET', `/circles/${enc(circleId)}/rooms`, {
                    signal,
                }),
            queryKey: cercleKeys.rooms(circleId),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    stats: (range: CercleRange) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleStats>('GET', '/stats/me', { params: { range }, signal }),
            queryKey: cercleKeys.stats('me', '', range),
            retry: cercleRetry,
            staleTime: 5 * 60 * 1000,
        }),
    user: (username: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleUserDetail>('GET', `/users/${enc(username)}`, { signal }),
            queryKey: cercleKeys.user(username),
            retry: cercleRetry,
            staleTime: STALE,
        }),
    users: () =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleList<CercleUser>>('GET', '/users', { signal }),
            queryKey: cercleKeys.users(),
            retry: cercleRetry,
            staleTime: 5 * 60 * 1000,
        }),
    userStats: (username: string, range: CercleRange) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleStats>('GET', `/stats/users/${enc(username)}`, {
                    params: { range },
                    signal,
                }),
            queryKey: cercleKeys.stats('user', username, range),
            retry: cercleRetry,
            staleTime: 5 * 60 * 1000,
        }),
    wrapped: (year: number, username?: string) =>
        queryOptions({
            queryFn: ({ signal }) =>
                cercleRequest<CercleWrapped>('GET', `/wrapped/${year}`, {
                    params: { user: username },
                    signal,
                }),
            queryKey: cercleKeys.wrapped(year, username),
            retry: cercleRetry,
            staleTime: 10 * 60 * 1000,
        }),
};
