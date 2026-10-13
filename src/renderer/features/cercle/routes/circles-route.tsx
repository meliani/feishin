import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import styles from './cercle-routes.module.css';

import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleCircle } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { CercleCard, CerclePage } from '/@/renderer/features/cercle/components/cercle-page';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';

export const CircleForm = ({
    circle,
    onDone,
}: {
    circle?: CercleCircle;
    onDone?: (circle: CercleCircle) => void;
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState(circle?.name || '');
    const [description, setDescription] = useState(circle?.description || '');

    const save = useMutation({
        mutationFn: () =>
            circle
                ? cercleApi.updateCircle(circle.id, { description, name: name.trim() })
                : cercleApi.createCircle({ description, name: name.trim() }),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (saved) => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.circles() });
            closeAllModals();
            onDone?.(saved);
        },
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) {
                    save.mutate();
                }
            }}
        >
            <Stack>
                <TextInput
                    data-autofocus
                    label={t('cercle.circles.name')}
                    maxLength={80}
                    onChange={(e) => setName(e.currentTarget.value)}
                    required
                    value={name}
                />
                <Textarea
                    autosize
                    label={t('cercle.circles.description')}
                    maxLength={500}
                    minRows={2}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    value={description}
                />
                <Group justify="flex-end">
                    <Button onClick={() => closeAllModals()} variant="default">
                        {t('cercle.common.cancel')}
                    </Button>
                    <Button
                        disabled={!name.trim()}
                        loading={save.isPending}
                        type="submit"
                        variant="filled"
                    >
                        {circle ? t('cercle.common.save') : t('cercle.circles.create')}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
};

const CircleRow = ({ circle }: { circle: CercleCircle }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const isEveryone = circle.kind === 'everyone';
    const joined = circle.my_role !== null;

    const join = useMutation({
        mutationFn: () => cercleApi.joinCircle(circle.id),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.all });
            toast.success({ message: t('cercle.circles.joinedEveryone') });
        },
    });

    return (
        <CercleCard>
            <div className={styles.row}>
                <Icon color="muted" icon={isEveryone ? 'cercle' : 'group'} size="xl" />
                <div className={styles.grow}>
                    {joined ? (
                        <Link
                            className={styles.link}
                            to={`/cercle/circles/${encodeURIComponent(circle.id)}`}
                        >
                            <Text fw={600}>
                                {isEveryone ? t('cercle.circles.everyone') : circle.name}
                            </Text>
                        </Link>
                    ) : (
                        <Text fw={600}>
                            {isEveryone ? t('cercle.circles.everyone') : circle.name}
                        </Text>
                    )}
                    <Text isMuted overflow="hidden" size="sm">
                        {isEveryone && !circle.description
                            ? t('cercle.circles.everyoneDescription')
                            : circle.description}
                    </Text>
                </div>
                <Group gap="xs" wrap="nowrap">
                    <Badge>{t('cercle.circles.memberCount', { count: circle.member_count })}</Badge>
                    {circle.my_role && circle.my_role !== 'member' ? (
                        <Badge variant="outline">{t(`cercle.roles.${circle.my_role}`)}</Badge>
                    ) : null}
                    {!joined && isEveryone ? (
                        <Button
                            loading={join.isPending}
                            onClick={() => join.mutate()}
                            size="compact-sm"
                            variant="filled"
                        >
                            {t('cercle.circles.join')}
                        </Button>
                    ) : null}
                </Group>
            </div>
        </CercleCard>
    );
};

const CirclesContent = () => {
    const { t } = useTranslation();
    const circles = useQuery(cercleQueries.circles());

    if (circles.isPending) {
        return <CercleSkeleton count={3} />;
    }

    if (circles.isError) {
        return (
            <EmptyState
                icon="error"
                message={getCercleErrorMessage(circles.error, t)}
                title={t('cercle.common.error')}
            />
        );
    }

    const sorted = [...circles.data.items].sort((a, b) => {
        if (a.kind !== b.kind) {
            return a.kind === 'everyone' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return (
        <Stack gap="sm">
            {sorted.map((circle) => (
                <CircleRow circle={circle} key={circle.id} />
            ))}
            {sorted.filter((c) => c.kind === 'custom').length === 0 ? (
                <EmptyState
                    icon="group"
                    message={t('cercle.circles.emptyMessage')}
                    title={t('cercle.circles.emptyTitle')}
                />
            ) : null}
        </Stack>
    );
};

const CirclesRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const openCreate = () =>
        openModal({
            children: (
                <CircleForm
                    onDone={(circle) =>
                        navigate(`/cercle/circles/${encodeURIComponent(circle.id)}`)
                    }
                />
            ),
            title: t('cercle.circles.create'),
        });

    return (
        <CerclePage
            actions={
                <Button
                    leftSection={<Icon icon="add" />}
                    onClick={openCreate}
                    size="compact-md"
                    variant="filled"
                >
                    {t('cercle.circles.create')}
                </Button>
            }
            title={t('cercle.nav.circles')}
        >
            <CirclesContent />
        </CerclePage>
    );
};

export default CirclesRoute;
