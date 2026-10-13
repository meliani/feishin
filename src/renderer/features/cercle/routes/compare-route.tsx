import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import styles from './cercle-routes.module.css';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import {
    CercleCard,
    CerclePage,
    CercleSection,
} from '/@/renderer/features/cercle/components/cercle-page';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { TopList } from '/@/renderer/features/cercle/components/stats-view';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { RangeSwitch, useRange } from '/@/renderer/features/cercle/routes/stats-route';
import { useCurrentServer } from '/@/renderer/store/auth.store';
import { Text } from '/@/shared/components/text/text';

const ScoreRing = ({ score }: { score: number }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(1, score));

    return (
        <svg aria-hidden height="112" viewBox="0 0 100 100" width="112">
            <circle
                cx="50"
                cy="50"
                fill="none"
                r={radius}
                stroke="var(--theme-colors-border)"
                strokeWidth="8"
            />
            <circle
                cx="50"
                cy="50"
                fill="none"
                r={radius}
                stroke="var(--theme-colors-primary)"
                strokeDasharray={`${circumference * clamped} ${circumference}`}
                strokeLinecap="round"
                strokeWidth="8"
                transform="rotate(-90 50 50)"
            />
            <text
                dominantBaseline="middle"
                fill="var(--theme-colors-foreground)"
                fontSize="20"
                fontWeight="700"
                textAnchor="middle"
                x="50"
                y="52"
            >
                {Math.round(clamped * 100)}%
            </text>
        </svg>
    );
};

const PickUser = () => {
    const { t } = useTranslation();
    const users = useQuery(cercleQueries.users());
    const server = useCurrentServer();
    const others = (users.data?.items || []).filter((u) => u.username !== server?.username);

    if (users.isPending) {
        return <CercleSkeleton count={3} height={48} />;
    }

    if (others.length === 0) {
        return <EmptyState message={t('cercle.compare.noOne')} title={t('cercle.compare.title')} />;
    }

    return (
        <CercleSection title={t('cercle.compare.pick')}>
            <CercleCard>
                <div className={styles.list}>
                    {others.map((user) => (
                        <Link
                            className={`${styles.listRow} ${styles.link}`}
                            key={user.username}
                            to={`/cercle/compare/${encodeURIComponent(user.username)}`}
                        >
                            <UserAvatar size={28} user={user} />
                            <Text size="sm">{user.display_name}</Text>
                        </Link>
                    ))}
                </div>
            </CercleCard>
        </CercleSection>
    );
};

const CompareContent = () => {
    const { t } = useTranslation();
    const { username } = useParams();
    const { range, setRange } = useRange();
    const user = useQuery({ ...cercleQueries.user(username || ''), enabled: Boolean(username) });
    const compare = useQuery({
        ...cercleQueries.compare(username || '', range),
        enabled: Boolean(username),
    });

    if (!username) {
        return <PickUser />;
    }

    const name = user.data?.display_name || username;

    return (
        <>
            <div className={styles.toolbar}>
                <Text fw={600}>{t('cercle.compare.withUser', { name })}</Text>
                <RangeSwitch onChange={setRange} value={range} />
            </div>
            {compare.isPending ? <CercleSkeleton count={3} height={100} /> : null}
            {compare.isError ? (
                <EmptyState
                    icon="compare"
                    message={getCercleErrorMessage(compare.error, t)}
                    title={t('cercle.stats.unavailable')}
                />
            ) : null}
            {compare.data ? (
                <>
                    <CercleCard>
                        <div className={styles.hero}>
                            <ScoreRing score={compare.data.score} />
                            <div className={styles.grow}>
                                <Text fw={600} size="lg">
                                    {t('cercle.compare.score')}
                                </Text>
                                <Text isMuted size="sm">
                                    {t('cercle.compare.scoreHelp')}
                                </Text>
                            </div>
                        </div>
                    </CercleCard>
                    <div className={styles.grid}>
                        <CercleSection title={t('cercle.compare.commonArtists')}>
                            <CercleCard>
                                <TopList entries={compare.data.common_artists} kind="artists" />
                            </CercleCard>
                        </CercleSection>
                        <CercleSection title={t('cercle.compare.commonAlbums')}>
                            <CercleCard>
                                <TopList entries={compare.data.common_albums} kind="albums" />
                            </CercleCard>
                        </CercleSection>
                    </div>
                </>
            ) : null}
        </>
    );
};

const CompareRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.compare.title')}>
            <CompareContent />
        </CerclePage>
    );
};

export default CompareRoute;
