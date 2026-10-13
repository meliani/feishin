import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import styles from './cercle-routes.module.css';

import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleRoom } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { CercleCard, CerclePage } from '/@/renderer/features/cercle/components/cercle-page';
import { CircleChips } from '/@/renderer/features/cercle/components/circle-chips';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import {
    useCercleActiveRoom,
    useCercleStore,
} from '/@/renderer/features/cercle/store/cercle-store';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

const CreateRoomForm = ({
    circleId,
    onCreated,
}: {
    circleId: string;
    onCreated: (room: CercleRoom) => void;
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');

    const create = useMutation({
        mutationFn: () => cercleApi.createRoom(circleId, name.trim()),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (room) => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.rooms(circleId) });
            useCercleStore.getState().actions.setActiveRoom({ id: room.id, role: 'host' });
            closeAllModals();
            onCreated(room);
        },
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) {
                    create.mutate();
                }
            }}
        >
            <Stack>
                <TextInput
                    data-autofocus
                    label={t('cercle.rooms.name')}
                    maxLength={80}
                    onChange={(e) => setName(e.currentTarget.value)}
                    placeholder={t('cercle.rooms.namePlaceholder')}
                    required
                    value={name}
                />
                <Text isMuted size="sm">
                    {t('cercle.rooms.hostNote')}
                </Text>
                <Group justify="flex-end">
                    <Button onClick={() => closeAllModals()} variant="default">
                        {t('cercle.common.cancel')}
                    </Button>
                    <Button
                        disabled={!name.trim()}
                        loading={create.isPending}
                        type="submit"
                        variant="filled"
                    >
                        {t('cercle.rooms.create')}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
};

const RoomRow = ({ room }: { room: CercleRoom }) => {
    const { t } = useTranslation();
    const activeRoom = useCercleActiveRoom();

    return (
        <CercleCard>
            <div className={styles.row}>
                <Icon color="muted" icon="headphones" size="xl" />
                <Link
                    className={`${styles.link} ${styles.grow}`}
                    to={`/cercle/rooms/${encodeURIComponent(room.id)}`}
                >
                    <Text fw={600}>{room.name}</Text>
                    <Group gap={6} wrap="nowrap">
                        <UserAvatar size={18} user={room.host} />
                        <Text isMuted size="sm">
                            {t('cercle.rooms.hostedBy', { name: room.host.display_name })}
                        </Text>
                    </Group>
                </Link>
                {activeRoom?.id === room.id ? <Badge>{t('cercle.rooms.youAreIn')}</Badge> : null}
                {room.state.playing ? (
                    <Badge variant="outline">{t('cercle.rooms.playing')}</Badge>
                ) : null}
                <Badge variant="light">
                    {t('cercle.rooms.listenerCount', { count: room.listeners.length })}
                </Badge>
            </div>
        </CercleCard>
    );
};

const RoomsContent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const circles = useQuery(cercleQueries.circles());
    const joined = (circles.data?.items || []).filter((c) => c.my_role !== null);
    const circleId = searchParams.get('circle') || joined[0]?.id || '';
    const rooms = useQuery({ ...cercleQueries.rooms(circleId), enabled: Boolean(circleId) });

    if (circles.isPending) {
        return <CercleSkeleton count={3} />;
    }

    if (joined.length === 0) {
        return (
            <EmptyState
                action={
                    <Button component={Link} to="/cercle/circles" variant="default">
                        {t('cercle.nav.circles')}
                    </Button>
                }
                icon="headphones"
                message={t('cercle.rooms.needCircle')}
                title={t('cercle.rooms.emptyTitle')}
            />
        );
    }

    const openCreate = () =>
        openModal({
            children: (
                <CreateRoomForm
                    circleId={circleId}
                    onCreated={(room) => navigate(`/cercle/rooms/${encodeURIComponent(room.id)}`)}
                />
            ),
            title: t('cercle.rooms.create'),
        });

    return (
        <>
            <div className={styles.toolbar}>
                <div className={styles.grow}>
                    <CircleChips
                        circles={joined}
                        includeAll={false}
                        onChange={(id) => setSearchParams({ circle: id }, { replace: true })}
                        value={circleId}
                    />
                </div>
                <Button
                    leftSection={<Icon icon="add" />}
                    onClick={openCreate}
                    size="compact-md"
                    variant="filled"
                >
                    {t('cercle.rooms.create')}
                </Button>
            </div>
            {rooms.isPending ? <CercleSkeleton count={2} /> : null}
            {rooms.isError ? (
                <EmptyState
                    icon="error"
                    message={getCercleErrorMessage(rooms.error, t)}
                    title={t('cercle.common.error')}
                />
            ) : null}
            {rooms.data && rooms.data.items.length === 0 ? (
                <EmptyState
                    icon="headphones"
                    message={t('cercle.rooms.emptyMessage')}
                    title={t('cercle.rooms.emptyTitle')}
                />
            ) : null}
            <Stack gap="sm">
                {(rooms.data?.items || []).map((room) => (
                    <RoomRow key={room.id} room={room} />
                ))}
            </Stack>
        </>
    );
};

const RoomsRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.nav.rooms')}>
            <RoomsContent />
        </CerclePage>
    );
};

export default RoomsRoute;
