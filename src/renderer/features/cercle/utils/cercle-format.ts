import { useEffect, useState } from 'react';

import i18n from '/@/i18n/i18n';
import { CercleLive } from '/@/renderer/features/cercle/api/cercle-types';

export const formatListeningTime = (ms: number) => {
    const totalMinutes = Math.round(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return i18n.t('cercle.units.minutes', { count: minutes });
    }

    return i18n.t('cercle.units.hoursMinutes', { hours, minutes });
};

export const formatClock = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const formatNumber = (value: number) => {
    try {
        return new Intl.NumberFormat(i18n.language).format(value);
    } catch {
        return String(value);
    }
};

export const livePositionMs = (
    live: Pick<CercleLive, 'position_ms' | 'state' | 'track' | 'updated_at'>,
    now: number,
) => {
    const elapsed = live.state === 'playing' ? Math.max(0, now - Date.parse(live.updated_at)) : 0;
    const position = live.position_ms + elapsed;
    return live.track.duration_ms ? Math.min(position, live.track.duration_ms) : position;
};

// Re-renders the caller every `intervalMs` with the current time (for live progress).
export const useNow = (intervalMs = 1000) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return now;
};

export const getInitials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';

// Deterministic hue per username so avatars stay recognisable across pages.
export const getUserHue = (username: string) => {
    let hash = 0;
    for (let i = 0; i < username.length; i += 1) {
        hash = (hash * 31 + username.charCodeAt(i)) % 360;
    }
    return hash;
};

export const getInviteLink = (urlPath: string) => {
    if (typeof window === 'undefined' || !window.location.protocol.startsWith('http')) {
        return urlPath;
    }

    // Feishin uses a hash router, so app paths live after "#".
    return `${window.location.origin}${window.location.pathname}#${urlPath}`;
};

export const RANGES = ['7d', '30d', 'year', 'all'] as const;
