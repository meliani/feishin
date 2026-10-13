import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { CercleCard, CerclePage } from '/@/renderer/features/cercle/components/cercle-page';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

const JoinContent = () => {
    const { t } = useTranslation();
    const { code = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const preview = useQuery(cercleQueries.invite(code));

    const accept = useMutation({
        mutationFn: () => cercleApi.acceptInvite(code),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (circle) => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.all });
            toast.success({ message: t('cercle.join.welcome', { name: circle.name }) });
            navigate(`/cercle/circles/${encodeURIComponent(circle.id)}`, { replace: true });
        },
    });

    if (preview.isPending) {
        return <CercleSkeleton count={1} height={160} />;
    }

    if (preview.isError || !preview.data.valid) {
        return (
            <EmptyState
                action={
                    <Button component={Link} to="/cercle/circles" variant="default">
                        {t('cercle.nav.circles')}
                    </Button>
                }
                icon="link"
                message={
                    preview.isError
                        ? getCercleErrorMessage(preview.error, t)
                        : t('cercle.join.invalidMessage')
                }
                title={t('cercle.join.invalidTitle')}
            />
        );
    }

    const { circle, created_by: createdBy } = preview.data;

    return (
        <CercleCard>
            <Stack align="center" gap="md" py="lg">
                <Icon color="primary" icon="group" size="4xl" />
                <Text fw={700} size="xl" ta="center">
                    {t('cercle.join.title', { name: circle.name })}
                </Text>
                <Group gap="xs" justify="center">
                    <UserAvatar size={24} user={createdBy} />
                    <Text isMuted size="sm">
                        {t('cercle.join.invitedBy', { name: createdBy.display_name })}
                    </Text>
                </Group>
                <Text isMuted size="sm">
                    {t('cercle.circles.memberCount', { count: circle.member_count })}
                </Text>
                <Text isMuted maw="32rem" size="sm" ta="center">
                    {t('cercle.join.privacyNote')}
                </Text>
                <Group justify="center">
                    <Button component={Link} to="/cercle" variant="default">
                        {t('cercle.common.notNow')}
                    </Button>
                    <Button
                        loading={accept.isPending}
                        onClick={() => accept.mutate()}
                        variant="filled"
                    >
                        {t('cercle.join.accept')}
                    </Button>
                </Group>
            </Stack>
        </CercleCard>
    );
};

const JoinRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.join.pageTitle')}>
            <JoinContent />
        </CerclePage>
    );
};

export default JoinRoute;
