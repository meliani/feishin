import { useTranslation } from 'react-i18next';

import styles from './stats-charts.module.css';

import i18n from '/@/i18n/i18n';
import { formatNumber } from '/@/renderer/features/cercle/utils/cercle-format';

const weekdayNames = () => {
    // 2024-01-01 was a Monday; the hub's by_weekday starts on Monday too.
    try {
        const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
        return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
    } catch {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
};

const formatDay = (date: string) => {
    try {
        return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(
            new Date(`${date}T00:00:00`),
        );
    } catch {
        return date;
    }
};

export const HourClock = ({ values }: { values: number[] }) => {
    const { t } = useTranslation();
    const max = Math.max(1, ...values);
    const center = 100;
    const inner = 34;
    const outer = 92;

    return (
        <figure className={styles.figure}>
            <svg
                aria-label={t('cercle.stats.byHour')}
                className={styles.clock}
                role="img"
                viewBox="0 0 200 200"
            >
                <circle className={styles.ring} cx={center} cy={center} r={inner - 4} />
                {Array.from({ length: 24 }, (_, hour) => {
                    const value = values[hour] || 0;
                    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
                    const length = (value / max) * (outer - inner);
                    const x1 = center + Math.cos(angle) * inner;
                    const y1 = center + Math.sin(angle) * inner;
                    const x2 = center + Math.cos(angle) * (inner + Math.max(2, length));
                    const y2 = center + Math.sin(angle) * (inner + Math.max(2, length));
                    return (
                        <line
                            className={value > 0 ? styles.spoke : styles.spokeEmpty}
                            key={hour}
                            x1={x1}
                            x2={x2}
                            y1={y1}
                            y2={y2}
                        >
                            <title>{t('cercle.stats.hourTooltip', { count: value, hour })}</title>
                        </line>
                    );
                })}
                {[0, 6, 12, 18].map((hour) => {
                    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
                    return (
                        <text
                            className={styles.label}
                            dominantBaseline="middle"
                            key={hour}
                            textAnchor="middle"
                            x={center + Math.cos(angle) * (inner - 14)}
                            y={center + Math.sin(angle) * (inner - 14)}
                        >
                            {hour}
                        </text>
                    );
                })}
            </svg>
            <figcaption className={styles.caption}>{t('cercle.stats.byHour')}</figcaption>
        </figure>
    );
};

export const WeekdayBars = ({ values }: { values: number[] }) => {
    const { t } = useTranslation();
    const max = Math.max(1, ...values);
    const names = weekdayNames();

    return (
        <figure className={styles.figure}>
            <div aria-label={t('cercle.stats.byWeekday')} className={styles.weekdays} role="img">
                {names.map((name, index) => {
                    const value = values[index] || 0;
                    return (
                        <div
                            className={styles.weekday}
                            key={name}
                            title={`${name}: ${formatNumber(value)}`}
                        >
                            <div className={styles.weekdayTrack}>
                                <div
                                    className={styles.weekdayBar}
                                    style={{ height: `${(value / max) * 100}%` }}
                                />
                            </div>
                            <span className={styles.label}>{name}</span>
                        </div>
                    );
                })}
            </div>
            <figcaption className={styles.caption}>{t('cercle.stats.byWeekday')}</figcaption>
        </figure>
    );
};

export const DailyChart = ({ days }: { days: { date: string; plays: number }[] }) => {
    const { t } = useTranslation();

    if (days.length === 0) {
        return null;
    }

    const max = Math.max(1, ...days.map((d) => d.plays));
    const barWidth = 10;
    const width = days.length * barWidth;

    return (
        <figure className={styles.figure}>
            <svg
                aria-label={t('cercle.stats.byDay')}
                className={styles.daily}
                preserveAspectRatio="none"
                role="img"
                viewBox={`0 0 ${width} 100`}
            >
                {days.map((day, index) => {
                    const height = (day.plays / max) * 96;
                    return (
                        <rect
                            className={styles.dayBar}
                            height={Math.max(day.plays > 0 ? 2 : 0, height)}
                            key={day.date}
                            width={barWidth - 2}
                            x={index * barWidth + 1}
                            y={100 - Math.max(day.plays > 0 ? 2 : 0, height)}
                        >
                            <title>{`${formatDay(day.date)}: ${formatNumber(day.plays)}`}</title>
                        </rect>
                    );
                })}
            </svg>
            <div className={styles.axis}>
                <span>{formatDay(days[0].date)}</span>
                <span>{formatDay(days[days.length - 1].date)}</span>
            </div>
            <figcaption className={styles.caption}>{t('cercle.stats.byDay')}</figcaption>
        </figure>
    );
};
