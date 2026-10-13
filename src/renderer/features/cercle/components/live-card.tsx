import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './live-card.module.css';

import { CercleLive } from '/@/renderer/features/cercle/api/cercle-types';
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { useListenAlong } from '/@/renderer/features/cercle/hooks/use-cercle-play';
import { formatClock, livePositionMs } from '/@/renderer/features/cercle/utils/cercle-format';
import { useCurrentServer } from '/@/renderer/store/auth.store';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';

interface LiveCardProps {
    live: CercleLive;
    now: number;
    variant?: 'compact' | 'large';
}

export const LiveCard = ({ live, now, variant = 'compact' }: LiveCardProps) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const listenAlong = useListenAlong();
    const [busy, setBusy] = useState(false);

    const isMe = server?.username === live.user.username;
    const position = livePositionMs(live, now);
    const duration = live.track.duration_ms;
    const progress = duration ? Math.min(100, (position / duration) * 100) : 0;
    const large = variant === 'large';

    const handleListenAlong = async () => {
        setBusy(true);
        try {
            await listenAlong(live);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={clsx(styles.card, { [styles.large]: large })}>
            <div className={styles.top}>
                <CoverArt id={live.track.album_id} size={large ? 88 : 56} />
                <div className={styles.meta}>
                    <div className={styles.user}>
                        <UserAvatar size={20} user={live.user} />
                        <Text fw={600} overflow="hidden" size="sm">
                            {live.user.display_name}
                        </Text>
                        {live.state === 'paused' ? (
                            <Icon color="muted" icon="mediaPause" size="sm" />
                        ) : (
                            <span aria-hidden className={styles.equalizer}>
                                <span />
                                <span />
                                <span />
                            </span>
                        )}
                    </div>
                    <Text fw={500} overflow="hidden" size="sm">
                        {live.track.title}
                    </Text>
                    <Text isMuted overflow="hidden" size="xs">
                        {live.track.artist}
                        {large && live.track.album ? ` - ${live.track.album}` : ''}
                    </Text>
                </div>
            </div>
            <div className={styles.progressRow}>
                <div
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(progress)}
                    className={styles.progress}
                    role="progressbar"
                >
                    <div className={styles.bar} style={{ width: `${progress}%` }} />
                </div>
                <Text isMuted size="xs">
                    {formatClock(position)}
                    {duration ? ` / ${formatClock(duration)}` : ''}
                </Text>
            </div>
            {!isMe ? (
                <Button
                    fullWidth
                    leftSection={<Icon icon="headphones" />}
                    loading={busy}
                    onClick={handleListenAlong}
                    size="compact-sm"
                    variant="default"
                >
                    {t('cercle.live.listenAlong')}
                </Button>
            ) : (
                <Text isMuted size="xs">
                    {live.player_name ? t('cercle.live.youOn', { player: live.player_name }) : ''}
                </Text>
            )}
        </div>
    );
};
