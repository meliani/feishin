import axios, { AxiosError, Method } from 'axios';

import { CercleError, CercleSession } from '/@/renderer/features/cercle/api/cercle-types';
import { useCercleStore } from '/@/renderer/features/cercle/store/cercle-store';
import { useAuthStore } from '/@/renderer/store/auth.store';
import { logger } from '/@/renderer/utils/logger';
import { ServerListItemWithCredential, ServerType } from '/@/shared/types/domain-types';

export type CercleClientErrorCode =
    | 'hub_unreachable'
    | 'no_credentials'
    | 'no_hub'
    | 'no_server'
    | 'unsupported_server'
    | string;

export type CercleContext = {
    hubUrl: string;
    key: string;
    server: ServerListItemWithCredential;
};

export class CercleClientError extends Error {
    code: CercleClientErrorCode;
    status?: number;

    constructor(code: CercleClientErrorCode, message: string, status?: number) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// Accepts absolute URLs and same-origin paths such as "/hub".
const normalizeHubUrl = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, '');
    if (trimmed.startsWith('/') && typeof window !== 'undefined') {
        return `${window.location.origin}${trimmed}`;
    }
    return trimmed;
};

export const resolveHubUrl = (server: null | Pick<ServerListItemWithCredential, 'url'>) => {
    const setting = useCercleStore.getState().hubUrl;
    if (setting) {
        return normalizeHubUrl(setting);
    }

    const injected = typeof window !== 'undefined' ? window.CERCLE_HUB_URL : undefined;
    // An unsubstituted template value (dev builds) starts with "$".
    if (injected && !injected.startsWith('$')) {
        return normalizeHubUrl(injected);
    }

    if (!server?.url) {
        return '';
    }

    try {
        return `${new URL(server.url).origin}/hub`;
    } catch {
        return '';
    }
};

const readParam = (credential: string, name: string) => {
    const match = credential.match(new RegExp(`(?:^|&)${name}=([^&]*)`));
    if (!match) {
        return undefined;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

// Builds the /auth/session body from the Subsonic credential Feishin already holds
// ("u=<user>&s=<salt>&t=<token>" or legacy "u=<user>&p=<password>").
export const getSessionBody = (server: ServerListItemWithCredential) => {
    const credential = server.credential || '';
    const salt = readParam(credential, 's');
    const token = readParam(credential, 't');
    const password = readParam(credential, 'p');

    if (salt && token) {
        return { salt, token, username: server.username };
    }

    if (password) {
        return { password, username: server.username };
    }

    return null;
};

export const getCercleContext = (): CercleContext => {
    const server = useAuthStore.getState().currentServer as null | ServerListItemWithCredential;

    if (!server) {
        throw new CercleClientError('no_server', 'No server selected');
    }

    if (server.type === ServerType.JELLYFIN) {
        throw new CercleClientError('unsupported_server', 'Cercle needs a Navidrome server');
    }

    const hubUrl = resolveHubUrl(server);
    if (!hubUrl) {
        throw new CercleClientError('no_hub', 'No Cercle hub URL configured');
    }

    return { hubUrl, key: `${server.id}@${hubUrl}`, server };
};

const toClientError = (error: unknown): CercleClientError => {
    if (error instanceof CercleClientError) {
        return error;
    }

    const axiosError = error as AxiosError<CercleError>;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;

    if (body && typeof body === 'object' && body.error) {
        return new CercleClientError(body.error.code, body.error.message, status);
    }

    if (!axiosError.response) {
        return new CercleClientError('hub_unreachable', axiosError.message || 'Network error');
    }

    return new CercleClientError(
        status === 401 ? 'unauthorized' : 'http_error',
        axiosError.message,
        status,
    );
};

const pendingLogins = new Map<string, Promise<string>>();

const login = (ctx: CercleContext): Promise<string> => {
    const pending = pendingLogins.get(ctx.key);
    if (pending) {
        return pending;
    }

    const body = getSessionBody(ctx.server);
    if (!body) {
        return Promise.reject(
            new CercleClientError('no_credentials', 'No Subsonic credentials for this server'),
        );
    }

    const promise = axios
        .post<CercleSession>(`${ctx.hubUrl}/api/v1/auth/session`, body, { timeout: 15000 })
        .then((res) => {
            useCercleStore.getState().actions.setSession(ctx.key, res.data.token);
            logger.info('Cercle hub session established', { hubUrl: ctx.hubUrl });
            return res.data.token;
        })
        .catch((error) => {
            const clientError = toClientError(error);
            logger.warn('Cercle hub login failed', { code: clientError.code, hubUrl: ctx.hubUrl });
            throw clientError;
        })
        .finally(() => {
            pendingLogins.delete(ctx.key);
        });

    pendingLogins.set(ctx.key, promise);
    return promise;
};

export const getCercleToken = async (ctx: CercleContext = getCercleContext()) => {
    const existing = useCercleStore.getState().sessions[ctx.key];
    if (existing) {
        return existing;
    }

    return login(ctx);
};

export const invalidateCercleToken = (ctx: CercleContext = getCercleContext()) => {
    useCercleStore.getState().actions.clearSession(ctx.key);
};

interface CercleRequestOptions {
    body?: unknown;
    params?: Record<string, number | string | undefined>;
    signal?: AbortSignal;
}

export const cercleRequest = async <T>(
    method: Method,
    path: string,
    options: CercleRequestOptions = {},
): Promise<T> => {
    const ctx = getCercleContext();

    const send = async (token: string) => {
        const res = await axios.request<T>({
            data: options.body,
            headers: { Authorization: `Bearer ${token}` },
            method,
            params: options.params,
            signal: options.signal,
            timeout: 20000,
            url: `${ctx.hubUrl}/api/v1${path}`,
        });
        return res.data;
    };

    try {
        const token = await getCercleToken(ctx);
        try {
            return await send(token);
        } catch (error) {
            if ((error as AxiosError).response?.status !== 401) {
                throw error;
            }

            // Token expired or revoked: log in again with the credentials we already hold.
            invalidateCercleToken(ctx);
            const fresh = await login(ctx);
            return await send(fresh);
        }
    } catch (error) {
        if (axios.isCancel(error)) {
            throw error;
        }

        throw toClientError(error);
    }
};

export const getCercleWsUrl = (ctx: CercleContext, token: string) => {
    const base = ctx.hubUrl.replace(/^http/, 'ws');
    return `${base}/api/v1/ws?token=${encodeURIComponent(token)}`;
};
