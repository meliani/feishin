import { useTranslation } from 'react-i18next';

import styles from './stats-view.module.css';

import { CercleStatEntry, CercleStats } from '/@/renderer/features/cercle/api/cercle-types';
import { CercleCard, CercleSection } from '/@/renderer/features/cercle/components/cercle-page';
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import {
    DailyChart,
    HourClock,
    WeekdayBars,
} from '/@/renderer/features/cercle/components/stats-charts';
import { useCerclePlay } from '/@/renderer/features/cercle/hooks/use-cercle-play';
import { formatListeningTime, formatNumber } from '/@/renderer/features/cercle/utils/cercle-format';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

type TopKind = 'albums' | 'artists' | 'tracks';

export const TopList = ({
    entries,
    kind,
    limit = 10,
}: {
    entries: CercleStatEntry[];
    kind: TopKind;
    limit?: number;
}) => {
    const { t } = useTranslation();
    const { playAlbum, playTrack } = useCerclePlay();
    const max = Math.max(1, ...entries.map((e) => e.plays));

    if (entries.length === 0) {
        return (
            <Text isMuted size="sm">
                {t('cercle.stats.nothingYet')}
            </Text>
        );
    }

    return (
        <ol className={styles.top}>
            {entries.slice(0, limit).map((entry, index) => {
                const albumId = kind === 'albums' ? entry.id : entry.album_id;
                const onPlay =
                    kind === 'albums'
                        ? () => playAlbum(entry.id)
                        : kind === 'tracks'
                          ? () => playTrack(entry.id)
                          : undefined;

                return (
                    <li className={styles.topRow} key={`${entry.id}-${index}`}>
                        <span className={styles.rank}>{index + 1}</span>
                        {kind !== 'artists' ? (
                            <CoverArt id={albumId} onClick={onPlay} size={36} />
                        ) : (
                            <CoverArt id={entry.id} itemType={LibraryItem.ALBUM_ARTIST} size={36} />
                        )}
                        <div className={styles.topMeta}>
                            <Text fw={500} overflow="hidden" size="sm">
                                {entry.name}
                            </Text>
                            {entry.artist ? (
                                <Text isMuted overflow="hidden" size="xs">
                                    {entry.artist}
                                </Text>
                            ) : null}
                            <div className={styles.meter}>
                                <div
                                    className={styles.meterBar}
                                    style={{ width: `${(entry.plays / max) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className={styles.topValue}>
                            <Text fw={600} size="sm">
                                {formatNumber(entry.plays)}
                            </Text>
                            <Text isMuted size="xs">
                                {formatListeningTime(entry.ms)}
                            </Text>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

export const StatTiles = ({ totals }: { totals: CercleStats['totals'] }) => {
    const { t } = useTranslation();
    const tiles = [
        { label: t('cercle.stats.plays'), value: formatNumber(totals.plays) },
        { label: t('cercle.stats.listeningTime'), value: formatListeningTime(totals.ms) },
        { label: t('cercle.stats.activeDays'), value: formatNumber(totals.active_days) },
        { label: t('cercle.stats.artists'), value: formatNumber(totals.distinct_artists) },
        { label: t('cercle.stats.albums'), value: formatNumber(totals.distinct_albums) },
    ];

    return (
        <div className={styles.tiles}>
            {tiles.map((tile) => (
                <div className={styles.tile} key={tile.label}>
                    <span className={styles.tileValue}>{tile.value}</span>
                    <span className={styles.tileLabel}>{tile.label}</span>
                </div>
            ))}
        </div>
    );
};

export const StatsView = ({ stats }: { stats: CercleStats }) => {
    const { t } = useTranslation();

    if (stats.totals.plays === 0) {
        return (
            <Text isMuted size="sm">
                {t('cercle.stats.nothingInRange')}
            </Text>
        );
    }

    return (
        <>
            <StatTiles totals={stats.totals} />
            <div className={styles.columns}>
                <CercleSection title={t('cercle.stats.topArtists')}>
                    <CercleCard>
                        <TopList entries={stats.top_artists} kind="artists" />
                    </CercleCard>
                </CercleSection>
                <CercleSection title={t('cercle.stats.topAlbums')}>
                    <CercleCard>
                        <TopList entries={stats.top_albums} kind="albums" />
                    </CercleCard>
                </CercleSection>
                <CercleSection title={t('cercle.stats.topTracks')}>
                    <CercleCard>
                        <TopList entries={stats.top_tracks} kind="tracks" />
                    </CercleCard>
                </CercleSection>
            </div>
            <CercleSection title={t('cercle.stats.habits')}>
                <div className={styles.charts}>
                    <CercleCard>
                        <HourClock values={stats.by_hour} />
                    </CercleCard>
                    <CercleCard>
                        <WeekdayBars values={stats.by_weekday} />
                    </CercleCard>
                </div>
                <CercleCard>
                    <DailyChart days={stats.by_day} />
                </CercleCard>
            </CercleSection>
        </>
    );
};
