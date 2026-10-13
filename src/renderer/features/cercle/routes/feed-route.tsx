import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { CerclePage } from '/@/renderer/features/cercle/components/cercle-page';
import { CircleChips } from '/@/renderer/features/cercle/components/circle-chips';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { FeedItemCard } from '/@/renderer/features/cercle/components/feed-item-card';
import { LiveStrip } from '/@/renderer/features/cercle/components/live-strip';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Stack } from '/@/shared/components/stack/stack';

const FeedContent = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const circle = searchParams.get('circle') || '';

    const circles = useQuery(cercleQueries.circles());
    const feed = useInfiniteQuery(cercleQueries.feed({ circle: circle || undefined }));

    const joinedCircles = (circles.data?.items || []).filter((c) => c.my_role !== null);
    const items = feed.data?.pages.flatMap((page) => page.items) || [];

    return (
        <>
            <LiveStrip />
            {joinedCircles.length > 1 ? (
                <CircleChips
                    circles={joinedCircles}
                    onChange={(id) => setSearchParams(id ? { circle: id } : {}, { replace: true })}
                    value={circle}
                />
            ) : null}
            {feed.isPending ? <CercleSkeleton count={6} height={96} /> : null}
            {feed.isError ? (
                <EmptyState
                    action={
                        <Button onClick={() => feed.refetch()} variant="default">
                            {t('cercle.common.retry')}
                        </Button>
                    }
                    icon="error"
                    message={getCercleErrorMessage(feed.error, t)}
                    title={t('cercle.common.error')}
                />
            ) : null}
            {feed.isSuccess && items.length === 0 ? (
                <EmptyState
                    message={t('cercle.feed.emptyMessage')}
                    title={t('cercle.feed.emptyTitle')}
                />
            ) : null}
            <Stack gap="sm">
                {items.map((item) => (
                    <FeedItemCard item={item} key={item.id} />
                ))}
            </Stack>
            {feed.hasNextPage ? (
                <Center>
                    <Button
                        loading={feed.isFetchingNextPage}
                        onClick={() => feed.fetchNextPage()}
                        variant="default"
                    >
                        {t('cercle.common.loadMore')}
                    </Button>
                </Center>
            ) : null}
        </>
    );
};

const FeedRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.title')}>
            <FeedContent />
        </CerclePage>
    );
};

export default FeedRoute;
