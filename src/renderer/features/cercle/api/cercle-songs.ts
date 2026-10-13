import { QueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { CercleTrack } from '/@/renderer/features/cercle/api/cercle-types';
import { Song } from '/@/shared/types/domain-types';

// Hub track ids are Navidrome media file ids, so they resolve on the user's own server.
export const fetchCercleSong = (queryClient: QueryClient, serverId: string, id: string) =>
    queryClient.fetchQuery({
        queryFn: ({ signal }) =>
            api.controller.getSongDetail({ apiClientProps: { serverId, signal }, query: { id } }),
        queryKey: queryKeys.songs.detail(serverId, { id }),
        staleTime: 5 * 60 * 1000,
    });

export const songToCercleTrack = (song: Song): CercleTrack => ({
    album: song.album || '',
    album_id: song.albumId || '',
    artist: song.artistName || song.artists?.[0]?.name || '',
    artist_id: song.artists?.[0]?.id || '',
    duration_ms: song.duration || 0,
    id: song.id,
    title: song.name,
});
