import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './cercle-routes.module.css';

import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    getCercleContext,
    invalidateCercleToken,
} from '/@/renderer/features/cercle/api/cercle-client';
import { CercleMe, CercleSettings } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleGate,
    getCercleErrorMessage,
    useCercleAvailability,
} from '/@/renderer/features/cercle/components/cercle-gate';
import {
    CercleCard,
    CerclePage,
    CercleSection,
} from '/@/renderer/features/cercle/components/cercle-page';
import {
    useCercleConnection,
    useCercleStore,
} from '/@/renderer/features/cercle/store/cercle-store';
import { useNow } from '/@/renderer/features/cercle/utils/cercle-format';
import { formatHrDateTime } from '/@/renderer/utils/format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Select } from '/@/shared/components/select/select';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

const DELAYS = [0, 15, 30, 60, 180, 720, 1440];

const minutesUntilTomorrowMorning = () => {
    const now = new Date();
    const target = new Date(now);
    target.setDate(now.getDate() + 1);
    target.setHours(8, 0, 0, 0);
    return Math.max(1, Math.round((target.getTime() - now.getTime()) / 60000));
};

const useSettingsMutation = <T,>(fn: (input: T) => Promise<CercleSettings>) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: fn,
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (settings) => {
            queryClient.setQueryData<CercleMe>(cercleKeys.me(), (me) =>
                me ? { ...me, settings: { ...me.settings, ...settings } } : me,
            );
            void queryClient.invalidateQueries({ queryKey: cercleKeys.live() });
        },
    });
};

const PauseSharing = ({ settings }: { settings: CercleSettings }) => {
    const { t } = useTranslation();
    const pause = useSettingsMutation((minutes: number) => cercleApi.pause(minutes));
    const pausedUntil = settings.paused_until ? Date.parse(settings.paused_until) : 0;
    const now = useNow(30 * 1000);
    const paused = pausedUntil > now;

    const presets = [
        { label: t('cercle.privacy.pause30m'), minutes: () => 30 },
        { label: t('cercle.privacy.pause2h'), minutes: () => 120 },
        { label: t('cercle.privacy.pause8h'), minutes: () => 480 },
        { label: t('cercle.privacy.pauseTomorrow'), minutes: minutesUntilTomorrowMorning },
    ];

    return (
        <CercleSection title={t('cercle.privacy.pauseTitle')}>
            <CercleCard>
                <Group gap="xs">
                    <Badge variant={paused ? 'filled' : 'outline'}>
                        {paused
                            ? t('cercle.privacy.pausedBadge')
                            : t('cercle.privacy.sharingBadge')}
                    </Badge>
                    <Text isMuted size="sm">
                        {paused
                            ? t('cercle.privacy.pausedUntil', {
                                  when: formatHrDateTime(settings.paused_until),
                              })
                            : t('cercle.privacy.pauseHelp')}
                    </Text>
                </Group>
                <Group gap="xs">
                    {presets.map((preset) => (
                        <Button
                            disabled={pause.isPending}
                            key={preset.label}
                            onClick={() => pause.mutate(preset.minutes())}
                            size="compact-md"
                            variant="default"
                        >
                            {preset.label}
                        </Button>
                    ))}
                    {paused ? (
                        <Button
                            loading={pause.isPending}
                            onClick={() => pause.mutate(0)}
                            size="compact-md"
                            variant="filled"
                        >
                            {t('cercle.privacy.resume')}
                        </Button>
                    ) : null}
                </Group>
            </CercleCard>
        </CercleSection>
    );
};

const HistoryDelay = ({ settings }: { settings: CercleSettings }) => {
    const { t } = useTranslation();
    const update = useSettingsMutation((minutes: number) =>
        cercleApi.updateSettings({ history_delay_minutes: minutes }),
    );

    const label = (minutes: number) => {
        if (minutes === 0) {
            return t('cercle.privacy.delayNone');
        }
        if (minutes < 60) {
            return t('cercle.privacy.delayMinutes', { count: minutes });
        }
        return t('cercle.privacy.delayHours', { count: minutes / 60 });
    };

    const options = DELAYS.includes(settings.history_delay_minutes)
        ? DELAYS
        : [...DELAYS, settings.history_delay_minutes].sort((a, b) => a - b);

    return (
        <CercleSection title={t('cercle.privacy.delayTitle')}>
            <CercleCard>
                <Text isMuted size="sm">
                    {t('cercle.privacy.delayHelp')}
                </Text>
                <Select
                    aria-label={t('cercle.privacy.delayTitle')}
                    data={options.map((minutes) => ({
                        label: label(minutes),
                        value: String(minutes),
                    }))}
                    disabled={update.isPending}
                    onChange={(value) => {
                        if (value !== null) {
                            update.mutate(Number(value));
                        }
                    }}
                    value={String(settings.history_delay_minutes)}
                    width="14rem"
                />
            </CercleCard>
        </CercleSection>
    );
};

const HiddenItems = ({ settings }: { settings: CercleSettings }) => {
    const { t } = useTranslation();
    const remove = useSettingsMutation(
        ({ id, kind }: { id: string; kind: 'album' | 'artist' | 'track' }) =>
            cercleApi.removeHidden(kind, id),
    );

    return (
        <CercleSection title={t('cercle.privacy.hiddenTitle')}>
            <CercleCard>
                <Text isMuted size="sm">
                    {t('cercle.privacy.hiddenHelp')}
                </Text>
                {settings.hidden.length === 0 ? (
                    <Text isMuted size="sm">
                        {t('cercle.privacy.hiddenEmpty')}
                    </Text>
                ) : (
                    <div className={styles.list}>
                        {settings.hidden.map((hidden) => (
                            <div className={styles.listRow} key={`${hidden.kind}:${hidden.id}`}>
                                <Badge variant="outline">
                                    {t(`cercle.privacy.kind.${hidden.kind}`)}
                                </Badge>
                                <Text className={styles.grow} overflow="hidden" size="sm">
                                    {hidden.label || hidden.id}
                                </Text>
                                <ActionIcon
                                    aria-label={t('cercle.privacy.unhide')}
                                    icon="x"
                                    onClick={() =>
                                        remove.mutate({ id: hidden.id, kind: hidden.kind })
                                    }
                                    tooltip={{ label: t('cercle.privacy.unhide') }}
                                    variant="subtle"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CercleCard>
        </CercleSection>
    );
};

const Profile = ({ me }: { me: CercleMe }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState(me.display_name);

    const save = useMutation({
        mutationFn: () => cercleApi.updateMe({ display_name: name.trim() }),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (updated) => {
            queryClient.setQueryData(cercleKeys.me(), updated);
            toast.success({ message: t('cercle.privacy.saved') });
        },
    });

    return (
        <CercleSection title={t('cercle.privacy.profileTitle')}>
            <CercleCard>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (name.trim() && name.trim() !== me.display_name) {
                            save.mutate();
                        }
                    }}
                >
                    <Group align="flex-end" gap="sm">
                        <TextInput
                            description={t('cercle.privacy.displayNameHelp', {
                                username: me.username,
                            })}
                            label={t('cercle.privacy.displayName')}
                            maxLength={64}
                            onChange={(e) => setName(e.currentTarget.value)}
                            value={name}
                            width="18rem"
                        />
                        <Button
                            disabled={!name.trim() || name.trim() === me.display_name}
                            loading={save.isPending}
                            type="submit"
                            variant="filled"
                        >
                            {t('cercle.common.save')}
                        </Button>
                    </Group>
                </form>
            </CercleCard>
        </CercleSection>
    );
};

const HubConnection = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { hubUrl, hubUrlSetting, reason } = useCercleAvailability();
    const connection = useCercleConnection();
    const setHubUrl = useCercleStore((state) => state.actions.setHubUrl);
    const [draft, setDraft] = useState(hubUrlSetting);

    const signOut = async () => {
        try {
            const ctx = getCercleContext();
            const token = useCercleStore.getState().sessions[ctx.key];
            if (token) {
                await axios
                    .delete(`${ctx.hubUrl}/api/v1/auth/session`, {
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 10000,
                    })
                    .catch(() => undefined);
            }
            invalidateCercleToken(ctx);
        } catch {
            // No context: nothing to sign out of.
        }
        queryClient.removeQueries({ queryKey: cercleKeys.all });
        toast.success({ message: t('cercle.privacy.signedOut') });
    };

    return (
        <CercleSection title={t('cercle.privacy.hubTitle')}>
            <CercleCard>
                <Text isMuted size="sm">
                    {t('cercle.privacy.hubHelp')}
                </Text>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setHubUrl(draft);
                        toast.success({ message: t('cercle.privacy.saved') });
                    }}
                >
                    <Group align="flex-end" gap="sm">
                        <TextInput
                            label={t('cercle.privacy.hubUrl')}
                            onChange={(e) => setDraft(e.currentTarget.value)}
                            placeholder={
                                hubUrlSetting ? '' : hubUrl || 'https://navidrome.example.com/hub'
                            }
                            type="url"
                            value={draft}
                            width="24rem"
                        />
                        <Button
                            disabled={draft.trim() === hubUrlSetting}
                            type="submit"
                            variant="filled"
                        >
                            {t('cercle.common.save')}
                        </Button>
                        {hubUrlSetting ? (
                            <Button
                                onClick={() => {
                                    setDraft('');
                                    setHubUrl('');
                                }}
                                variant="subtle"
                            >
                                {t('cercle.privacy.useDefault')}
                            </Button>
                        ) : null}
                    </Group>
                </form>
                <Group gap="xs">
                    <Badge variant="outline">{t(`cercle.connection.${connection}`)}</Badge>
                    <Text isMuted size="xs">
                        {reason ? t('cercle.gate.noHubTitle') : hubUrl}
                    </Text>
                    {!reason ? (
                        <Button onClick={signOut} size="compact-sm" variant="subtle">
                            {t('cercle.privacy.signOut')}
                        </Button>
                    ) : null}
                </Group>
            </CercleCard>
        </CercleSection>
    );
};

const PrivacyContent = () => {
    const me = useQuery(cercleQueries.me());

    if (!me.data) {
        return null;
    }

    return (
        <Stack gap="lg">
            <PauseSharing settings={me.data.settings} />
            <HistoryDelay settings={me.data.settings} />
            <HiddenItems settings={me.data.settings} />
            <Profile key={me.data.display_name} me={me.data} />
        </Stack>
    );
};

const PrivacyRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage gated={false} title={t('cercle.privacy.title')}>
            <CercleGate>
                <PrivacyContent />
            </CercleGate>
            <HubConnection />
        </CerclePage>
    );
};

export default PrivacyRoute;
