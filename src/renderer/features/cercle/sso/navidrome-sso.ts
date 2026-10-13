import { nanoid } from 'nanoid/non-secure';

import {
    findExistingServerLockServer,
    normalizeServerUrl,
} from '/@/renderer/features/action-required/utils/server-lock';
import { useCercleStore } from '/@/renderer/features/cercle/store/cercle-store';
import { isCercleSsoEnabled } from '/@/renderer/features/cercle/utils/cercle-env';
import { useAuthStore } from '/@/renderer/store/auth.store';
import { logger } from '/@/renderer/utils/logger';
import { ServerListItemWithCredential, ServerType } from '/@/shared/types/domain-types';

// Navidrome's UI index, when reached through a trusted reverse proxy carrying the ExtAuth user
// header, embeds `window.__APP_CONFIG__ = "<JSON>"` whose `auth` member mirrors a successful
// POST /auth/login (subsonicSalt, subsonicToken, ...). Reading it lets a single-sign-on deployment
// skip Feishin's password form entirely.
//
// Recent Navidrome versions (seen on 0.64) leave the JWT (`token`) out of that payload: requests
// through the proxy are authenticated by its user header, so none is needed. The server entry then
// carries NAVIDROME_PROXY_SESSION instead of a JWT, and no bearer header is sent.

export type NavidromeSsoAuth = {
    id?: string;
    isAdmin?: boolean;
    name?: string;
    subsonicSalt: string;
    subsonicToken: string;
    token?: string;
    username: string;
};

// Stands in for the Navidrome JWT when the reverse proxy authenticates every request. Feishin
// treats a Navidrome server without ndCredential as signed out, so the field cannot stay empty.
export const NAVIDROME_PROXY_SESSION = 'cercle-proxy-session';

export const navidromeBearer = (ndCredential?: string) =>
    ndCredential && ndCredential !== NAVIDROME_PROXY_SESSION ? `Bearer ${ndCredential}` : undefined;

const SSO_TIMEOUT_MS = 10 * 1000;
const NAVIDROME_UI_PATH = '/app/';

const APP_CONFIG_PATTERN = /window\.__APP_CONFIG__\s*=\s*([\s\S]*?)\s*;?\s*(?:\r?\n|<\/script>)/;

const parseJsValue = (raw: string): unknown => {
    const text = raw.trim();
    // Go's html/template may emit \xHH escapes, which JSON does not accept.
    const json = text.replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1');
    return JSON.parse(json);
};

export const parseNavidromeAppConfig = (html: string): null | Record<string, unknown> => {
    const match = html.match(APP_CONFIG_PATTERN);
    if (!match) {
        return null;
    }

    try {
        let value: unknown = match[1].trim();
        // Usually a JS string literal holding JSON (two decodes); tolerate a plain object too.
        for (let i = 0; i < 3 && typeof value === 'string'; i += 1) {
            const text = value.trim();
            if (!text.startsWith('"') && !text.startsWith('{')) {
                return null;
            }
            value = parseJsValue(text);
        }

        return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    } catch (error) {
        logger.warn('Navidrome app config could not be parsed', { error });
        return null;
    }
};

const toSsoAuth = (config: null | Record<string, unknown>): NavidromeSsoAuth | null => {
    const auth = config?.auth as Partial<NavidromeSsoAuth> | undefined;
    if (
        !auth ||
        typeof auth.username !== 'string' ||
        (auth.token !== undefined && typeof auth.token !== 'string') ||
        typeof auth.subsonicSalt !== 'string' ||
        typeof auth.subsonicToken !== 'string' ||
        !auth.username ||
        !auth.subsonicSalt ||
        !auth.subsonicToken
    ) {
        return null;
    }

    return auth as NavidromeSsoAuth;
};

export const fetchNavidromeSsoAuth = async (): Promise<NavidromeSsoAuth | null> => {
    const serverUrl = normalizeServerUrl(window.SERVER_URL || '');
    if (!serverUrl) {
        return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SSO_TIMEOUT_MS);

    try {
        // The proxy session cookie rides along; an expired session redirects to the identity
        // provider, which fails CORS or yields a page without __APP_CONFIG__ (both mean "no").
        const response = await fetch(`${serverUrl}${NAVIDROME_UI_PATH}`, {
            cache: 'no-store',
            credentials: 'include',
            headers: { Accept: 'text/html' },
            signal: controller.signal,
        });

        if (!response.ok) {
            logger.info('Cercle SSO: Navidrome UI not available', { status: response.status });
            return null;
        }

        const auth = toSsoAuth(parseNavidromeAppConfig(await response.text()));
        if (!auth) {
            logger.info('Cercle SSO: no reverse-proxy session found');
        }
        return auth;
    } catch (error) {
        logger.info('Cercle SSO: request failed', { error });
        return null;
    } finally {
        clearTimeout(timer);
    }
};

// Mirrors what the login route does with a Navidrome authenticate() result under SERVER_LOCK.
export const applyNavidromeSsoAuth = (auth: NavidromeSsoAuth): ServerListItemWithCredential => {
    const { actions, serverList } = useAuthStore.getState();
    const url = normalizeServerUrl(window.SERVER_URL || '');
    const remoteUrl = normalizeServerUrl(window.REMOTE_URL || '');
    const existing = findExistingServerLockServer(serverList, url);

    const fields = {
        credential: `u=${auth.username}&s=${auth.subsonicSalt}&t=${auth.subsonicToken}`,
        isAdmin: Boolean(auth.isAdmin),
        name: window.SERVER_NAME || existing?.name || '',
        ndCredential: auth.token || NAVIDROME_PROXY_SESSION,
        remoteUrl,
        url,
        userId: auth.id || null,
        username: auth.username,
    };

    let server: ServerListItemWithCredential;
    if (existing) {
        if (existing.username && existing.username !== auth.username) {
            // Someone else signed in through the proxy: drop the previous user's hub sessions.
            useCercleStore.setState({ activeRoom: null, sessions: {} });
        }
        actions.updateServer(existing.id, fields);
        server = useAuthStore.getState().serverList[existing.id];
    } else {
        server = { id: nanoid(), type: ServerType.NAVIDROME, ...fields };
        actions.addServer(server);
    }

    actions.setCurrentServer(server);

    // Server lock allows a single server entry.
    Object.keys(useAuthStore.getState().serverList).forEach((id) => {
        if (id !== server.id) {
            actions.deleteServer(id);
        }
    });

    logger.info('Cercle SSO: signed in through the reverse proxy', { username: auth.username });
    return server;
};

let pendingSso: null | Promise<NavidromeSsoAuth | null> = null;

// Deduplicated: many requests can hit 401 at once when the Navidrome JWT expires.
export const refreshNavidromeSso = () => {
    if (!pendingSso) {
        pendingSso = fetchNavidromeSsoAuth()
            .then((auth) => {
                if (auth) {
                    applyNavidromeSsoAuth(auth);
                }
                return auth;
            })
            .finally(() => {
                pendingSso = null;
            });
    }
    return pendingSso;
};

type RetryableConfig = { _cercleSso?: boolean; headers?: Record<string, unknown> };

// Hook for the Navidrome API client: on 401, renew the session silently from the proxy and
// replay the request once. Returns null when SSO does not apply, so the caller keeps its
// normal handling (re-login with a saved password, or back to the login form).
export const retryWithNavidromeSso = <T>(
    error: { config?: RetryableConfig },
    replay: (config: any) => Promise<T>,
    onFail: () => void,
): null | Promise<T> => {
    const config = error.config;
    if (!isCercleSsoEnabled() || !config || config._cercleSso) {
        return null;
    }

    return refreshNavidromeSso().then((auth) => {
        if (!auth) {
            onFail();
            throw error;
        }

        config._cercleSso = true;
        const headers = { ...config.headers };
        const bearer = navidromeBearer(auth.token);
        if (bearer) {
            headers['x-nd-authorization'] = bearer;
        } else {
            delete headers['x-nd-authorization'];
        }
        config.headers = headers;
        return replay(config);
    });
};
