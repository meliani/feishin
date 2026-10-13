import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import styles from './live-strip.module.css';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleSection } from '/@/renderer/features/cercle/components/cercle-page';
import { LiveCard } from '/@/renderer/features/cercle/components/live-card';
import { useNow } from '/@/renderer/features/cercle/utils/cercle-format';
import { Button } from '/@/shared/components/button/button';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';

export const LiveStrip = () => {
    const { t } = useTranslation();
    const live = useQuery(cercleQueries.live());
    const now = useNow(1000);

    if (live.isPending) {
        return (
            <div className={styles.strip}>
                <Skeleton height={130} width={256} />
                <Skeleton height={130} width={256} />
            </div>
        );
    }

    const items = live.data?.items || [];
    if (items.length === 0) {
        return null;
    }

    return (
        <CercleSection
            action={
                <Button component={Link} size="compact-sm" to="/cercle/live" variant="subtle">
                    {t('cercle.common.seeAll')}
                </Button>
            }
            title={t('cercle.live.nowPlaying')}
        >
            <div className={styles.strip}>
                {items.map((item) => (
                    <LiveCard key={item.user.username} live={item} now={now} />
                ))}
            </div>
        </CercleSection>
    );
};
