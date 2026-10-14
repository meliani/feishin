import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '/@/renderer/features/cercle/i18n/cercle-i18n';
import {
    DeviceLoginStart,
    getDeviceLoginBase,
    pollDeviceLogin,
    startDeviceLogin,
} from '/@/renderer/features/cercle/device/device-login-api';
import { Button } from '/@/shared/components/button/button';
import { Code } from '/@/shared/components/code/code';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

type Credentials = { password: string; username: string };

type Props = {
    // Same path as the password form: authenticate, store the server, remember the password.
    onCredentials: (credentials: Credentials) => Promise<void>;
};

type State = 'expired' | 'failed' | 'idle' | 'signing-in' | 'waiting';

const openBrowser = (url: string) => {
    // In the desktop app, window.open goes to the system browser (setWindowOpenHandler).
    window.open(url, '_blank', 'noopener');
};

// "Sign in with the browser" under the login form, shown only when the build sets
// CERCLE_DEVICE_LOGIN_URL (see cercle-desktop-defaults.ts).
export const CercleDeviceLogin = ({ onCredentials }: Props) => {
    const { t } = useTranslation();
    const [request, setRequest] = useState<DeviceLoginStart | null>(null);
    const [state, setState] = useState<State>('idle');
    const timer = useRef<null | ReturnType<typeof setTimeout>>(null);

    const stop = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    }, []);

    useEffect(() => stop, [stop]);

    const start = async () => {
        stop();
        setState('waiting');
        let started: DeviceLoginStart;
        try {
            started = await startDeviceLogin();
        } catch {
            setState('failed');
            return;
        }
        setRequest(started);
        openBrowser(started.verification_url);

        const deadline = Date.now() + started.expires_in * 1000;
        const interval = Math.max(2, started.interval) * 1000;

        const tick = async () => {
            if (Date.now() > deadline) {
                setState('expired');
                return;
            }
            try {
                const result = await pollDeviceLogin(started.device_code);
                if (result.status === 'approved') {
                    setState('signing-in');
                    await onCredentials({ password: result.password, username: result.username });
                    setRequest(null);
                    setState('idle');
                    return;
                }
                if (result.status === 'expired') {
                    setState('expired');
                    return;
                }
            } catch {
                // Network hiccup: try again on the next tick.
            }
            timer.current = setTimeout(tick, interval);
        };
        timer.current = setTimeout(tick, interval);
    };

    if (!getDeviceLoginBase()) {
        return null;
    }

    if (state === 'waiting' || state === 'signing-in') {
        return (
            <Stack align="center" gap="sm">
                <Text c="dimmed" size="sm" ta="center">
                    {t('cercle.device.waiting')}
                </Text>
                {request && (
                    <Code fw={700} fz="xl">
                        {request.user_code}
                    </Code>
                )}
                <Group gap="xs" justify="center">
                    {request && (
                        <Button
                            onClick={() => openBrowser(request.verification_url)}
                            size="compact-sm"
                            variant="subtle"
                        >
                            {t('cercle.device.reopen')}
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            stop();
                            setRequest(null);
                            setState('idle');
                        }}
                        size="compact-sm"
                        variant="subtle"
                    >
                        {t('cercle.device.cancel')}
                    </Button>
                </Group>
            </Stack>
        );
    }

    return (
        <Stack gap="xs">
            <Text c="dimmed" size="sm" ta="center">
                {t('cercle.device.or')}
            </Text>
            <Button fullWidth onClick={start} variant="default">
                {t('cercle.device.button')}
            </Button>
            {state === 'expired' && (
                <Text c="dimmed" size="sm" ta="center">
                    {t('cercle.device.expired')}
                </Text>
            )}
            {state === 'failed' && (
                <Text c="dimmed" size="sm" ta="center">
                    {t('cercle.device.failed')}
                </Text>
            )}
        </Stack>
    );
};
