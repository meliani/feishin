import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { cercleKeys } from '/@/renderer/features/cercle/api/cercle-api';
import { applyCercleMessage } from '/@/renderer/features/cercle/api/cercle-cache';
import { resolveHubUrl } from '/@/renderer/features/cercle/api/cercle-client';
import { cercleSocket } from '/@/renderer/features/cercle/api/cercle-socket';
import { useRoomSync } from '/@/renderer/features/cercle/hooks/use-room-sync';
import '/@/renderer/features/cercle/i18n/cercle-i18n';
import {
    useCercleHubUrlSetting,
    useCercleStore,
} from '/@/renderer/features/cercle/store/cercle-store';
import { useCurrentServerWithCredential } from '/@/renderer/store/auth.store';
import { ServerType } from '/@/shared/types/domain-types';

// Mounted once next to the other global player hooks. It owns the hub socket (started
// only after a hub session exists, so nothing is contacted before Cercle is first used),
// merges live events into the query cache and runs listen-together sync.
const useCercleLiveConnection = () => {
    const queryClient = useQueryClient();
    const server = useCurrentServerWithCredential();
    const hubUrlSetting = useCercleHubUrlSetting();

    const supported = Boolean(server) && server?.type !== ServerType.JELLYFIN;
    const hubUrl = supported ? resolveHubUrl(server) : '';
    const key = supported && hubUrl ? `${server.id}@${hubUrl}` : '';
    const hasSession = useCercleStore((state) => Boolean(key && state.sessions[key]));

    // Hub or server switch: nothing cached for the previous one is valid anymore.
    useEffect(() => {
        queryClient.removeQueries({ queryKey: cercleKeys.all });
        useCercleStore.getState().actions.setActiveRoom(null);
    }, [key, hubUrlSetting, queryClient]);

    useEffect(() => {
        if (!key || !hasSession) {
            return undefined;
        }

        cercleSocket.start();
        const unsubscribe = cercleSocket.subscribe((message) =>
            applyCercleMessage(queryClient, message),
        );

        const onOnline = () => {
            cercleSocket.stop();
            cercleSocket.start();
        };
        window.addEventListener('online', onOnline);

        return () => {
            window.removeEventListener('online', onOnline);
            unsubscribe();
            cercleSocket.stop();
        };
    }, [hasSession, key, queryClient]);
};

export const CercleHook = () => {
    useCercleLiveConnection();
    useRoomSync();
    return null;
};
