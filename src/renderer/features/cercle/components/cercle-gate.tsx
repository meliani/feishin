import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleClientError, resolveHubUrl } from '/@/renderer/features/cercle/api/cercle-client';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { useCercleHubUrlSetting } from '/@/renderer/features/cercle/store/cercle-store';
import { useCurrentServerWithCredential } from '/@/renderer/store/auth.store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { Stack } from '/@/shared/components/stack/stack';
import { ServerType } from '/@/shared/types/domain-types';

export const useCercleAvailability = () => {
    const server = useCurrentServerWithCredential();
    // Subscribing re-renders when the hub URL setting changes.
    const hubUrlSetting = useCercleHubUrlSetting();

    if (!server) {
        return { hubUrl: '', hubUrlSetting, reason: 'no_server' as const };
    }

    if (server.type === ServerType.JELLYFIN) {
        return { hubUrl: '', hubUrlSetting, reason: 'unsupported_server' as const };
    }

    const hubUrl = resolveHubUrl(server);
    if (!hubUrl) {
        return { hubUrl: '', hubUrlSetting, reason: 'no_hub' as const };
    }

    return { hubUrl, hubUrlSetting, reason: null };
};

export const CercleSkeleton = ({ count = 4, height = 72 }: { count?: number; height?: number }) => (
    <Stack gap="md">
        {Array.from({ length: count }).map((_, index) => (
            <Skeleton height={height} key={index} />
        ))}
    </Stack>
);

export const getCercleErrorMessage = (
    error: unknown,
    t: (key: string, options?: Record<string, unknown>) => string,
    hubUrl = '',
) => {
    const clientError = error as CercleClientError;
    if (clientError?.code === 'no_credentials') {
        return t('cercle.gate.noCredentials');
    }
    if (clientError?.code === 'hub_unreachable') {
        return t('cercle.gate.unreachable', { url: hubUrl });
    }
    if (clientError?.status === 401) {
        return t('cercle.gate.loginRejected');
    }
    if (clientError?.status === 403) {
        return t('cercle.common.forbidden');
    }
    if (clientError?.status === 404) {
        return t('cercle.common.notFound');
    }
    if (clientError?.status === 502) {
        return t('cercle.gate.navidromeDown');
    }
    return clientError?.message || t('cercle.common.error');
};

export const CercleGate = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation();
    const { hubUrl, reason } = useCercleAvailability();
    const me = useQuery({ ...cercleQueries.me(), enabled: !reason });

    if (reason === 'unsupported_server') {
        return (
            <EmptyState
                icon="server"
                message={t('cercle.gate.unsupportedMessage')}
                title={t('cercle.gate.unsupportedTitle')}
            />
        );
    }

    if (reason) {
        return (
            <EmptyState
                action={
                    <Button component={Link} to="/cercle/privacy" variant="default">
                        {t('cercle.gate.openSettings')}
                    </Button>
                }
                icon="server"
                message={t('cercle.gate.noHubMessage')}
                title={t('cercle.gate.noHubTitle')}
            />
        );
    }

    if (me.isPending) {
        return <CercleSkeleton />;
    }

    if (me.isError) {
        const error = me.error as CercleClientError;
        const message =
            error.status === 404
                ? t('cercle.gate.unreachable', { url: hubUrl })
                : getCercleErrorMessage(error, t, hubUrl);

        return (
            <EmptyState
                action={
                    <Group justify="center">
                        <Button
                            loading={me.isFetching}
                            onClick={() => me.refetch()}
                            variant="filled"
                        >
                            {t('cercle.common.retry')}
                        </Button>
                        <Button component={Link} to="/cercle/privacy" variant="default">
                            {t('cercle.gate.openSettings')}
                        </Button>
                    </Group>
                }
                icon="wifiOff"
                message={message}
                title={t('cercle.gate.errorTitle')}
            />
        );
    }

    return <>{children}</>;
};
