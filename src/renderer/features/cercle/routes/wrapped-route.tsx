import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';

import styles from './cercle-routes.module.css';

import i18n from '/@/i18n/i18n';
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
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { HourClock, WeekdayBars } from '/@/renderer/features/cercle/components/stats-charts';
import { TopList } from '/@/renderer/features/cercle/components/stats-view';
import { formatListeningTime, formatNumber } from '/@/renderer/features/cercle/utils/cercle-format';
import { formatDateAbsolute } from '/@/renderer/utils/format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

const formatMonth = (value: null | string) => {
    if (!value) {
        return '-';
    }
    // Accepts "YYYY-MM" or a month number.
    const date = /^\d{4}-\d{2}/.test(value)
        ? new Date(`${value.slice(0, 7)}-01T00:00:00`)
        : new Date(2024, Number(value) - 1, 1);
    try {
        return new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(date);
    } catch {
        return value;
    }
};

const Highlight = ({ label, value }: { label: string; value: string }) => (
    <CercleCard>
        <Text isMuted size="sm">
            {label}
        </Text>
        <span className={styles.bigNumber}>{value}</span>
    </CercleCard>
);

const WrappedContent = () => {
    const { t } = useTranslation();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const user = searchParams.get('user') || undefined;
    const currentYear = new Date().getFullYear();
    const year = Number(params.year) || currentYear;
    const wrapped = useQuery(cercleQueries.wrapped(year, user));
    const suffix = user ? `?user=${encodeURIComponent(user)}` : '';

    const nav = (
        <div className={styles.toolbar}>
            <div className={styles.row}>
                <ActionIcon
                    aria-label={t('cercle.wrapped.previous')}
                    component={Link}
                    icon="arrowLeftS"
                    to={`/cercle/wrapped/${year - 1}${suffix}`}
                    variant="subtle"
                />
                <Text fw={700} size="xl">
                    {year}
                </Text>
                <ActionIcon
                    aria-label={t('cercle.wrapped.next')}
                    component={Link}
                    disabled={year >= currentYear}
                    icon="arrowRightS"
                    to={`/cercle/wrapped/${Math.min(currentYear, year + 1)}${suffix}`}
                    variant="subtle"
                />
            </div>
        </div>
    );

    if (wrapped.isPending) {
        return (
            <>
                {nav}
                <CercleSkeleton count={4} height={120} />
            </>
        );
    }

    if (wrapped.isError) {
        return (
            <>
                {nav}
                <EmptyState
                    icon="sparkles"
                    message={getCercleErrorMessage(wrapped.error, t)}
                    title={t('cercle.stats.unavailable')}
                />
            </>
        );
    }

    const data = wrapped.data;
    if (data.totals.plays === 0) {
        return (
            <>
                {nav}
                <EmptyState
                    icon="sparkles"
                    message={t('cercle.wrapped.emptyMessage', { year })}
                    title={t('cercle.wrapped.title', { year })}
                />
            </>
        );
    }

    const topArtist = data.top_artists[0];
    const topAlbum = data.top_albums[0];
    const topTrack = data.top_tracks[0];

    return (
        <>
            {nav}
            <CercleCard>
                <div className={styles.hero}>
                    {topAlbum ? <CoverArt id={topAlbum.id} size={120} /> : null}
                    <div className={styles.grow}>
                        <Text isMuted size="sm">
                            {t('cercle.wrapped.youListened')}
                        </Text>
                        <span className={styles.bigNumber}>
                            {formatListeningTime(data.totals.ms)}
                        </span>
                        <Text size="sm">
                            {t('cercle.wrapped.summary', {
                                artists: formatNumber(data.totals.distinct_artists),
                                plays: formatNumber(data.totals.plays),
                            })}
                        </Text>
                    </div>
                </div>
            </CercleCard>
            <div className={styles.grid}>
                {topArtist ? (
                    <CercleCard>
                        <Text isMuted size="sm">
                            {t('cercle.wrapped.topArtist')}
                        </Text>
                        <div className={styles.row}>
                            <CoverArt
                                id={topArtist.id}
                                itemType={LibraryItem.ALBUM_ARTIST}
                                size={48}
                            />
                            <Text fw={700} size="lg">
                                {topArtist.name}
                            </Text>
                        </div>
                    </CercleCard>
                ) : null}
                {topTrack ? (
                    <CercleCard>
                        <Text isMuted size="sm">
                            {t('cercle.wrapped.topTrack')}
                        </Text>
                        <Text fw={700} size="lg">
                            {topTrack.name}
                        </Text>
                        <Text isMuted size="sm">
                            {topTrack.artist}
                        </Text>
                    </CercleCard>
                ) : null}
                <Highlight
                    label={t('cercle.wrapped.topMonth')}
                    value={formatMonth(data.top_month)}
                />
                <Highlight
                    label={t('cercle.wrapped.newArtists')}
                    value={formatNumber(data.new_artists)}
                />
                {data.longest_day ? (
                    <Highlight
                        label={t('cercle.wrapped.longestDay', {
                            date: formatDateAbsolute(data.longest_day.date),
                        })}
                        value={formatListeningTime(data.longest_day.ms)}
                    />
                ) : null}
                {data.first_play ? (
                    <Highlight
                        label={t('cercle.wrapped.firstPlay')}
                        value={
                            typeof data.first_play === 'string'
                                ? formatDateAbsolute(data.first_play)
                                : `${data.first_play.track.title} - ${formatDateAbsolute(data.first_play.played_at)}`
                        }
                    />
                ) : null}
            </div>
            <div className={styles.grid}>
                <CercleSection title={t('cercle.stats.topArtists')}>
                    <CercleCard>
                        <TopList entries={data.top_artists} kind="artists" limit={5} />
                    </CercleCard>
                </CercleSection>
                <CercleSection title={t('cercle.stats.topAlbums')}>
                    <CercleCard>
                        <TopList entries={data.top_albums} kind="albums" limit={5} />
                    </CercleCard>
                </CercleSection>
                <CercleSection title={t('cercle.stats.topTracks')}>
                    <CercleCard>
                        <TopList entries={data.top_tracks} kind="tracks" limit={5} />
                    </CercleCard>
                </CercleSection>
            </div>
            <div className={styles.grid}>
                <CercleCard>
                    <HourClock values={data.by_hour} />
                </CercleCard>
                <CercleCard>
                    <WeekdayBars values={data.by_weekday} />
                </CercleCard>
            </div>
        </>
    );
};

const WrappedRoute = () => {
    const { t } = useTranslation();
    const params = useParams();
    const year = Number(params.year) || new Date().getFullYear();
    return (
        <CerclePage title={t('cercle.wrapped.title', { year })}>
            <WrappedContent />
        </CerclePage>
    );
};

export default WrappedRoute;
