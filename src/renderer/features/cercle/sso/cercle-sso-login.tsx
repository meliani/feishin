import { ReactNode, useEffect, useState } from 'react';

import i18n from '/@/i18n/i18n';
import '/@/renderer/features/cercle/i18n/cercle-i18n';
import { refreshNavidromeSso } from '/@/renderer/features/cercle/sso/navidrome-sso';
import { isCercleSsoEnabled } from '/@/renderer/features/cercle/utils/cercle-env';
import { useAuthStore } from '/@/renderer/store/auth.store';
import { Center } from '/@/shared/components/center/center';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { toast } from '/@/shared/components/toast/toast';

// One automatic attempt per page load, so a failed SSO never loops back into itself.
let attempted = false;

// Wraps the login form: with CERCLE_SSO_LOGIN, tries the reverse-proxy session first and only
// shows the password form (with a short note) when that is not available.
export const CercleSsoLogin = ({ children }: { children: ReactNode }) => {
    const hasServer = useAuthStore((state) => Boolean(state.currentServer));
    const [pending, setPending] = useState(() => isCercleSsoEnabled() && !attempted && !hasServer);

    useEffect(() => {
        if (!pending) {
            return;
        }

        attempted = true;
        let cancelled = false;

        refreshNavidromeSso()
            .then((auth) => {
                if (!auth && !cancelled) {
                    toast.info({ message: i18n.t('cercle.sso.unavailable') });
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setPending(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pending]);

    if (pending) {
        return (
            <Center h="100vh" w="100%">
                <Spinner container />
            </Center>
        );
    }

    return <>{children}</>;
};
