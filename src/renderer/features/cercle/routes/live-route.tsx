import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import styles from './cercle-routes.module.css';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { CerclePage } from '/@/renderer/features/cercle/components/cercle-page';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { LiveCard } from '/@/renderer/features/cercle/components/live-card';
import { useNow } from '/@/renderer/features/cercle/utils/cercle-format';

const LiveContent = () => {
    const { t } = useTranslation();
    const live = useQuery(cercleQueries.live());
    const now = useNow(1000);

    if (live.isPending) {
        return <CercleSkeleton count={3} height={140} />;
    }

    if (live.isError) {
        return (
            <EmptyState
                icon="error"
                message={getCercleErrorMessage(live.error, t)}
                title={t('cercle.common.error')}
            />
        );
    }

    if (live.data.items.length === 0) {
        return (
            <EmptyState
                icon="live"
                message={t('cercle.live.emptyMessage')}
                title={t('cercle.live.emptyTitle')}
            />
        );
    }

    return (
        <div className={styles.grid}>
            {live.data.items.map((item) => (
                <LiveCard key={item.user.username} live={item} now={now} variant="large" />
            ))}
        </div>
    );
};

const LiveRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.nav.live')}>
            <LiveContent />
        </CerclePage>
    );
};

export default LiveRoute;
