import { InfiniteData, QueryClient } from '@tanstack/react-query';

import { CercleFeedFilter, cercleKeys } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleComment,
    CercleFeedItem,
    CercleList,
    CercleLive,
    CerclePage,
    CercleRoom,
    CercleRoomDetail,
    CercleWsMessage,
} from '/@/renderer/features/cercle/api/cercle-types';

type FeedData = InfiniteData<CerclePage<CercleFeedItem>>;

const mapFeedItems = (queryClient: QueryClient, fn: (item: CercleFeedItem) => CercleFeedItem) => {
    queryClient.setQueriesData<FeedData>({ queryKey: cercleKeys.feed() }, (data) => {
        if (!data) {
            return data;
        }

        return {
            ...data,
            pages: data.pages.map((page) => ({ ...page, items: page.items.map(fn) })),
        };
    });
};

export const upsertFeedItem = (queryClient: QueryClient, item: CercleFeedItem) => {
    const queries = queryClient.getQueryCache().findAll({ queryKey: cercleKeys.feed() });

    queries.forEach((query) => {
        const filter = (query.queryKey[2] || {}) as CercleFeedFilter;
        const data = query.state.data as FeedData | undefined;
        if (!data) {
            return;
        }

        const exists = data.pages.some((page) => page.items.some((i) => i.id === item.id));

        // A circle-filtered feed depends on visibility rules only the hub knows.
        if (filter.circle && !exists) {
            void queryClient.invalidateQueries({ exact: true, queryKey: query.queryKey });
            return;
        }

        if (filter.user && filter.user !== item.user.username) {
            return;
        }

        if (filter.circle) {
            queryClient.setQueryData<FeedData>(query.queryKey, {
                ...data,
                pages: data.pages.map((page) => ({
                    ...page,
                    items: page.items.map((i) => (i.id === item.id ? item : i)),
                })),
            });
            return;
        }

        // Updated groups move to the top, like a new item.
        const pages = data.pages.map((page) => ({
            ...page,
            items: page.items.filter((i) => i.id !== item.id),
        }));

        if (pages.length > 0) {
            pages[0] = { ...pages[0], items: [item, ...pages[0].items] };
        }

        queryClient.setQueryData<FeedData>(query.queryKey, { ...data, pages });
    });
};

export const replaceFeedItem = (queryClient: QueryClient, item: CercleFeedItem) => {
    mapFeedItems(queryClient, (i) => (i.id === item.id ? item : i));
};

const bumpCommentCount = (queryClient: QueryClient, itemId: string, delta: number) => {
    mapFeedItems(queryClient, (i) =>
        i.id === itemId ? { ...i, comment_count: Math.max(0, i.comment_count + delta) } : i,
    );
};

// Returns nothing; keeps the thread and the feed counter consistent whether the update
// comes from our own mutation or from the socket (whichever arrives first wins).
export const addComment = (queryClient: QueryClient, itemId: string, comment: CercleComment) => {
    const key = cercleKeys.comments(itemId);
    const thread = queryClient.getQueryData<CercleList<CercleComment>>(key);

    if (thread) {
        if (thread.items.some((c) => c.id === comment.id)) {
            return;
        }

        queryClient.setQueryData<CercleList<CercleComment>>(key, {
            items: [...thread.items, comment],
        });
    }

    bumpCommentCount(queryClient, itemId, 1);
};

export const updateComment = (queryClient: QueryClient, itemId: string, comment: CercleComment) => {
    queryClient.setQueryData<CercleList<CercleComment>>(cercleKeys.comments(itemId), (thread) =>
        thread ? { items: thread.items.map((c) => (c.id === comment.id ? comment : c)) } : thread,
    );
};

export const removeComment = (queryClient: QueryClient, itemId: string, commentId: string) => {
    const key = cercleKeys.comments(itemId);
    const thread = queryClient.getQueryData<CercleList<CercleComment>>(key);

    if (thread) {
        if (!thread.items.some((c) => c.id === commentId)) {
            return;
        }

        queryClient.setQueryData<CercleList<CercleComment>>(key, {
            items: thread.items.filter((c) => c.id !== commentId),
        });
    }

    bumpCommentCount(queryClient, itemId, -1);
};

const upsertLive = (queryClient: QueryClient, live: CercleLive) => {
    queryClient.setQueryData<CercleList<CercleLive>>(cercleKeys.live(), (data) => {
        if (!data) {
            return data;
        }

        const others = data.items.filter((l) => l.user.username !== live.user.username);
        return { items: [live, ...others] };
    });
};

const removeLive = (queryClient: QueryClient, username: string) => {
    queryClient.setQueryData<CercleList<CercleLive>>(cercleKeys.live(), (data) =>
        data ? { items: data.items.filter((l) => l.user.username !== username) } : data,
    );
};

export const upsertRoom = (queryClient: QueryClient, room: CercleRoom) => {
    queryClient.setQueryData<CercleRoomDetail>(cercleKeys.room(room.id), (data) =>
        data ? { ...data, ...room } : data,
    );

    queryClient.setQueryData<CercleList<CercleRoom>>(cercleKeys.rooms(room.circle_id), (data) => {
        if (!data) {
            return data;
        }

        const exists = data.items.some((r) => r.id === room.id);
        return {
            items: exists
                ? data.items.map((r) => (r.id === room.id ? room : r))
                : [room, ...data.items],
        };
    });
};

const removeRoom = (queryClient: QueryClient, roomId: string) => {
    queryClient.setQueriesData<CercleList<CercleRoom>>({ queryKey: cercleKeys.rooms() }, (data) =>
        data ? { items: data.items.filter((r) => r.id !== roomId) } : data,
    );
    queryClient.removeQueries({ queryKey: cercleKeys.room(roomId) });
};

export const applyCercleMessage = (queryClient: QueryClient, message: CercleWsMessage) => {
    switch (message.type) {
        case 'comment':
            addComment(queryClient, message.data.item_id, message.data.comment);
            break;
        case 'comment_deleted':
            removeComment(queryClient, message.data.item_id, message.data.comment_id);
            break;
        case 'feed_item':
            upsertFeedItem(queryClient, message.data);
            break;
        case 'hello':
            queryClient.setQueryData(cercleKeys.me(), message.data.user);
            break;
        case 'live':
            upsertLive(queryClient, message.data);
            break;
        case 'live_end':
            removeLive(queryClient, message.data.username);
            break;
        case 'reaction':
            mapFeedItems(queryClient, (i) =>
                i.id === message.data.item_id ? { ...i, reactions: message.data.reactions } : i,
            );
            break;
        case 'room_closed':
            removeRoom(queryClient, message.data.room_id);
            break;
        case 'room_request':
            queryClient.setQueryData<CercleRoomDetail>(
                cercleKeys.room(message.data.room_id),
                (data) => {
                    if (!data || data.requests.some((r) => r.id === message.data.request.id)) {
                        return data;
                    }
                    return { ...data, requests: [...data.requests, message.data.request] };
                },
            );
            break;
        case 'room_state':
            queryClient.setQueryData<CercleRoomDetail>(
                cercleKeys.room(message.data.room_id),
                (data) =>
                    data && message.data.state.seq > data.state.seq
                        ? { ...data, state: message.data.state }
                        : data,
            );
            break;
        case 'room_update':
            upsertRoom(queryClient, message.data);
            break;
        default:
            break;
    }
};

export const removeRoomRequest = (queryClient: QueryClient, roomId: string, requestId: string) => {
    queryClient.setQueryData<CercleRoomDetail>(cercleKeys.room(roomId), (data) =>
        data ? { ...data, requests: data.requests.filter((r) => r.id !== requestId) } : data,
    );
};
