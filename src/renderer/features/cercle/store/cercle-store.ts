import { persist } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';

export type CercleActiveRoom = {
    id: string;
    role: 'host' | 'listener';
};

export type CercleConnectionStatus = 'closed' | 'connecting' | 'idle' | 'open';

interface CercleStoreSlice extends CercleStoreState {
    actions: {
        clearSession: (key: string) => void;
        setActiveRoom: (room: CercleActiveRoom | null) => void;
        setConnection: (status: CercleConnectionStatus) => void;
        setHubUrl: (url: string) => void;
        setSession: (key: string, token: string) => void;
    };
}

interface CercleStoreState {
    activeRoom: CercleActiveRoom | null;
    connection: CercleConnectionStatus;
    // Empty string means "resolve automatically" (window.CERCLE_HUB_URL, then <server>/hub).
    hubUrl: string;
    // Hub session tokens keyed by `${serverId}@${hubUrl}`. Opaque bearer tokens, never logged.
    sessions: Record<string, string>;
}

export const useCercleStore = createWithEqualityFn<CercleStoreSlice>()(
    persist(
        (set) => ({
            actions: {
                clearSession: (key) =>
                    set((state) => {
                        const sessions = { ...state.sessions };
                        delete sessions[key];
                        return { sessions };
                    }),
                setActiveRoom: (activeRoom) => set({ activeRoom }),
                setConnection: (connection) => set({ connection }),
                setHubUrl: (hubUrl) => set({ hubUrl: hubUrl.trim() }),
                setSession: (key, token) =>
                    set((state) => ({ sessions: { ...state.sessions, [key]: token } })),
            },
            activeRoom: null,
            connection: 'idle',
            hubUrl: '',
            sessions: {},
        }),
        {
            name: 'store_cercle',
            partialize: (state) => ({ hubUrl: state.hubUrl, sessions: state.sessions }),
            version: 1,
        },
    ),
);

export const useCercleActions = () => useCercleStore((state) => state.actions);

export const useCercleActiveRoom = () => useCercleStore((state) => state.activeRoom);

export const useCercleConnection = () => useCercleStore((state) => state.connection);

export const useCercleHubUrlSetting = () => useCercleStore((state) => state.hubUrl);
