import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import styles from './feed-item-card.module.css';

import { CercleFeedItem } from '/@/renderer/features/cercle/api/cercle-types';
import { CommentThread } from '/@/renderer/features/cercle/components/comment-thread';
import { CoverArt } from '/@/renderer/features/cercle/components/cover-art';
import { ReactionsBar } from '/@/renderer/features/cercle/components/reactions-bar';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { useCerclePlay } from '/@/renderer/features/cercle/hooks/use-cercle-play';
import { formatDateRelative } from '/@/renderer/utils/format';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';

export const FeedItemCard = ({ item }: { item: CercleFeedItem }) => {
    const { t } = useTranslation();
    const { playAlbum, playTrack } = useCerclePlay();
    const [showComments, setShowComments] = useState(false);

    const albumId = item.album?.id || item.track?.album_id || '';
    const albumName = item.album?.name || item.track?.album || '';
    const artistName = item.artist?.name || item.album?.artist || item.track?.artist || '';

    let headline: string;
    let artId: string | undefined = albumId;
    let artType = LibraryItem.ALBUM;
    let onPlay: (() => void) | undefined;

    if (item.kind === 'discovery_artist') {
        headline = t('cercle.feed.discoveredArtist', { artist: artistName });
        if (!albumId && item.artist?.id) {
            artId = item.artist.id;
            artType = LibraryItem.ALBUM_ARTIST;
        }
        onPlay = albumId ? () => playAlbum(albumId) : undefined;
    } else if (item.kind === 'discovery_album') {
        headline = t('cercle.feed.discoveredAlbum', { album: albumName, artist: artistName });
        onPlay = albumId ? () => playAlbum(albumId) : undefined;
    } else if (item.play_count > 1 && albumName) {
        headline = t('cercle.feed.listenedAlbum', {
            album: albumName,
            artist: artistName,
            count: item.play_count,
        });
        onPlay = albumId ? () => playAlbum(albumId) : undefined;
    } else {
        headline = t('cercle.feed.listenedTrack', {
            artist: artistName,
            title: item.track?.title || albumName,
        });
        const trackId = item.track?.id;
        onPlay = trackId ? () => playTrack(trackId) : undefined;
    }

    return (
        <article className={styles.card}>
            <div className={styles.main}>
                <CoverArt id={artId} itemType={artType} onClick={onPlay} size={72} />
                <div className={styles.content}>
                    <div className={styles.header}>
                        <Link
                            className={styles.user}
                            to={`/cercle/stats/user/${encodeURIComponent(item.user.username)}`}
                        >
                            <UserAvatar size={22} user={item.user} />
                            <Text fw={600} size="sm">
                                {item.user.display_name}
                            </Text>
                        </Link>
                        <Text isMuted size="xs">
                            {formatDateRelative(item.ended_at || item.started_at)}
                        </Text>
                    </div>
                    <Text className={styles.headline} size="sm">
                        {item.kind !== 'listened' ? (
                            <Icon
                                className={styles.badge}
                                color="primary"
                                icon="sparkles"
                                size="sm"
                            />
                        ) : null}
                        {headline}
                    </Text>
                    {item.kind === 'listened' && item.play_count > 1 && item.track ? (
                        <Text isMuted overflow="hidden" size="xs">
                            {t('cercle.feed.lastTrack', { title: item.track.title })}
                        </Text>
                    ) : null}
                    <div className={styles.footer}>
                        <ReactionsBar item={item} />
                        <Button
                            leftSection={<Icon icon="comment" />}
                            onClick={() => setShowComments((open) => !open)}
                            size="compact-sm"
                            variant="subtle"
                        >
                            {item.comment_count > 0
                                ? t('cercle.feed.comments', { count: item.comment_count })
                                : t('cercle.feed.comment')}
                        </Button>
                    </div>
                </div>
            </div>
            {showComments ? <CommentThread itemId={item.id} /> : null}
        </article>
    );
};
