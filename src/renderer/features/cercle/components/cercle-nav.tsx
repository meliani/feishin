import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import styles from './cercle-nav.module.css';

import { useCercleConnection } from '/@/renderer/features/cercle/store/cercle-store';
import { Button } from '/@/shared/components/button/button';
import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';

type NavEntry = { icon: keyof typeof AppIcon; label: string; to: string };

const isActive = (pathname: string, to: string) =>
    to === '/cercle' ? pathname === '/cercle' || pathname === '/cercle/' : pathname.startsWith(to);

export const CercleNav = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const connection = useCercleConnection();

    const entries: NavEntry[] = [
        { icon: 'cercle', label: t('cercle.nav.feed'), to: '/cercle' },
        { icon: 'live', label: t('cercle.nav.live'), to: '/cercle/live' },
        { icon: 'chart', label: t('cercle.nav.stats'), to: '/cercle/stats' },
        { icon: 'headphones', label: t('cercle.nav.rooms'), to: '/cercle/rooms' },
        { icon: 'group', label: t('cercle.nav.circles'), to: '/cercle/circles' },
        { icon: 'visibilityOff', label: t('cercle.nav.privacy'), to: '/cercle/privacy' },
    ];

    const connectionLabel = t(`cercle.connection.${connection}`);

    return (
        <div className={styles.nav}>
            <div className={styles.links}>
                {entries.map((entry) => (
                    <Button
                        component={Link}
                        key={entry.to}
                        leftSection={<Icon icon={entry.icon} />}
                        size="compact-md"
                        to={entry.to}
                        variant={isActive(pathname, entry.to) ? 'filled' : 'subtle'}
                    >
                        {entry.label}
                    </Button>
                ))}
            </div>
            <Tooltip label={connectionLabel}>
                <span
                    aria-label={connectionLabel}
                    className={clsx(styles.dot, styles[connection])}
                    role="status"
                />
            </Tooltip>
        </div>
    );
};
