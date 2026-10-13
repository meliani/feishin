import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import styles from './cercle-routes.module.css';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleCircleStats, CercleStats } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import {
    CercleCard,
    CerclePage,
    CercleSection,
} from '/@/renderer/features/cercle/components/cercle-page';
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { StatsView } from '/@/renderer/features/cercle/components/stats-view';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { useCerclePlay } from '/@/renderer/features/cercle/hooks/use-cercle-play';
import {
    formatListeningTime,
    formatNumber,
    RANGES,
} from '/@/renderer/features/cercle/utils/cercle-format';
import { formatDateRelative } from '/@/renderer/utils/format';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Select } from '/@/shared/components/select/select';
import { Text } from '/@/shared/components/text/text';

export const useRange = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const range = searchParams.get('range') || '30d';
    const setRange = (value: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('range', value);
        setSearchParams(next, { replace: true });
    };
    return { range, setRange };
};

export const RangeSwitch = ({
    onChange,
    value,
}: {
    onChange: (v: string) => void;
    value: string;
}) => {
    const { t } = useTranslation();
    return (
        <SegmentedControl
            data={RANGES.map((range) => ({ label: t(`cercle.ranges.${range}`), value: range }))}
            onChange={onChange}
            size="xs"
            value={(RANGES as readonly string[]).includes(value) ? value : '30d'}
        />
    );
};

const ScopePicker = ({ value }: { value: string }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { range } = useRange();
    const circles = useQuery(cercleQueries.circles());
    const users = useQuery(cercleQueries.users());

    const data = [
        { group: t('cercle.stats.scopeMe'), items: [{ label: t('cercle.stats.me'), value: 'me' }] },
        {
            group: t('cercle.nav.circles'),
            items: (circles.data?.items || [])
                .filter((c) => c.my_role !== null)
                .map((c) => ({
                    label: c.kind === 'everyone' ? t('cercle.circles.everyone') : c.name,
                    value: `circle:${c.id}`,
                })),
        },
        {
            group: t('cercle.stats.people'),
            items: (users.data?.items || []).map((u) => ({
                label: u.display_name,
                value: `user:${u.username}`,
            })),
        },
    ].filter((group) => group.items.length > 0);

    return (
        <Select
            aria-label={t('cercle.stats.scope')}
            data={data}
            onChange={(next) => {
                if (!next) {
                    return;
                }
                const query = `?range=${encodeURIComponent(range)}`;
                if (next === 'me') {
                    navigate(`/cercle/stats${query}`);
                } else if (next.startsWith('circle:')) {
                    navigate(`/cercle/stats/circle/${encodeURIComponent(next.slice(7))}${query}`);
                } else {
                    navigate(`/cercle/stats/user/${encodeURIComponent(next.slice(5))}${query}`);
                }
            }}
            searchable
            size="xs"
            value={value}
            width="14rem"
        />
    );
};

const RecentPlays = ({ username }: { username: string }) => {
    const { t } = useTranslation();
    const { playTrack } = useCerclePlay();
    const plays = useInfiniteQuery(cercleQueries.plays(username));
    const items = plays.data?.pages.flatMap((page) => page.items) || [];

    if (plays.isPending) {
        return <CercleSkeleton count={3} height={40} />;
    }

    if (plays.isError || items.length === 0) {
        return null;
    }

    return (
        <CercleSection title={t('cercle.stats.recentPlays')}>
            <CercleCard>
                <div className={styles.list}>
                    {items.map((play) => (
                        <div className={styles.listRow} key={play.id}>
                            <CoverArt
                                id={play.track.album_id}
                                onClick={() => playTrack(play.track.id)}
                                size={36}
                            />
                            <div className={styles.grow}>
                                <Text fw={500} overflow="hidden" size="sm">
                                    {play.track.title}
                                </Text>
                                <Text isMuted overflow="hidden" size="xs">
                                    {play.track.artist}
                                </Text>
                            </div>
                            <Text isMuted size="xs">
                                {formatDateRelative(play.played_at)}
                            </Text>
                        </div>
                    ))}
                </div>
                {plays.hasNextPage ? (
                    <Button
                        loading={plays.isFetchingNextPage}
                        onClick={() => plays.fetchNextPage()}
                        size="compact-sm"
                        variant="subtle"
                    >
                        {t('cercle.common.loadMore')}
                    </Button>
                ) : null}
            </CercleCard>
        </CercleSection>
    );
};

const CircleMembers = ({ stats }: { stats: CercleCircleStats }) => {
    const { t } = useTranslation();
    const max = Math.max(1, ...stats.members.map((m) => m.plays));
    const sorted = [...stats.members].sort((a, b) => b.plays - a.plays);

    if (sorted.length === 0) {
        return null;
    }

    return (
        <CercleSection title={t('cercle.stats.members')}>
            <CercleCard>
                <div className={styles.list}>
                    {sorted.map((member) => (
                        <div className={styles.listRow} key={member.user.username}>
                            <UserAvatar size={28} user={member.user} />
                            <Link
                                className={`${styles.link} ${styles.grow}`}
                                to={`/cercle/stats/user/${encodeURIComponent(member.user.username)}`}
                            >
                                <Text fw={500} size="sm">
                                    {member.user.display_name}
                                </Text>
                                <div
                                    style={{
                                        background: 'var(--theme-colors-primary)',
                                        borderRadius: 2,
                                        height: 3,
                                        width: `${(member.plays / max) * 100}%`,
                                    }}
                                />
                            </Link>
                            <Text size="sm">{formatNumber(member.plays)}</Text>
                            <Text isMuted size="xs">
                                {formatListeningTime(member.ms)}
                            </Text>
                        </div>
                    ))}
                </div>
            </CercleCard>
        </CercleSection>
    );
};

const StatsBody = ({
    error,
    isPending,
    stats,
}: {
    error: unknown;
    isPending: boolean;
    stats?: CercleStats;
}) => {
    const { t } = useTranslation();

    if (isPending) {
        return <CercleSkeleton count={4} height={120} />;
    }

    if (error || !stats) {
        return (
            <EmptyState
                icon="chart"
                message={getCercleErrorMessage(error, t)}
                title={t('cercle.stats.unavailable')}
            />
        );
    }

    return <StatsView stats={stats} />;
};

const StatsContent = () => {
    const { t } = useTranslation();
    const { circleId, username } = useParams();
    const { range, setRange } = useRange();

    const scope = circleId ? 'circle' : username ? 'user' : 'me';
    const meStats = useQuery({ ...cercleQueries.stats(range), enabled: scope === 'me' });
    const userStats = useQuery({
        ...cercleQueries.userStats(username || '', range),
        enabled: scope === 'user',
    });
    const circleStats = useQuery({
        ...cercleQueries.circleStats(circleId || '', range),
        enabled: scope === 'circle',
    });
    const active = scope === 'circle' ? circleStats : scope === 'user' ? userStats : meStats;
    const year = new Date().getFullYear();
    const scopeValue =
        scope === 'circle' ? `circle:${circleId}` : scope === 'user' ? `user:${username}` : 'me';

    return (
        <>
            <div className={styles.toolbar}>
                <ScopePicker value={scopeValue} />
                <RangeSwitch onChange={setRange} value={range} />
            </div>
            <div className={styles.row}>
                {scope === 'user' && username ? (
                    <Button
                        component={Link}
                        leftSection={<Icon icon="compare" />}
                        size="compact-sm"
                        to={`/cercle/compare/${encodeURIComponent(username)}?range=${range}`}
                        variant="default"
                    >
                        {t('cercle.stats.compare')}
                    </Button>
                ) : null}
                {scope !== 'circle' ? (
                    <Button
                        component={Link}
                        leftSection={<Icon icon="sparkles" />}
                        size="compact-sm"
                        to={`/cercle/wrapped/${year}${username ? `?user=${encodeURIComponent(username)}` : ''}`}
                        variant="default"
                    >
                        {t('cercle.wrapped.title', { year })}
                    </Button>
                ) : null}
            </div>
            <StatsBody error={active.error} isPending={active.isPending} stats={active.data} />
            {scope === 'circle' && circleStats.data ? (
                <CircleMembers stats={circleStats.data} />
            ) : null}
            {scope === 'user' && username ? <RecentPlays username={username} /> : null}
        </>
    );
};

const StatsRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.nav.stats')}>
            <StatsContent />
        </CerclePage>
    );
};

export default StatsRoute;
