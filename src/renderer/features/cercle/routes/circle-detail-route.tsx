import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import styles from './cercle-routes.module.css';

import { cercleApi, cercleKeys, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    CercleCircleDetail,
    CercleInvite,
    CercleMember,
    CercleRole,
    CercleSharing,
} from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import {
    CercleCard,
    CerclePage,
    CercleSection,
} from '/@/renderer/features/cercle/components/cercle-page';
import { confirmCercleAction } from '/@/renderer/features/cercle/components/confirm';
import { EmptyState } from '/@/renderer/features/cercle/components/empty-state';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { CircleForm } from '/@/renderer/features/cercle/routes/circles-route';
import { getInviteLink } from '/@/renderer/features/cercle/utils/cercle-format';
import { useCurrentServer } from '/@/renderer/store/auth.store';
import { formatDateAbsolute, formatDateRelative } from '/@/renderer/utils/format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { CopyButton } from '/@/shared/components/copy-button/copy-button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { openModal } from '/@/shared/components/modal/modal';
import { Select } from '/@/shared/components/select/select';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

const SHARING_KEYS: (keyof CercleSharing)[] = [
    'share_live',
    'share_history',
    'share_stats',
    'share_discoveries',
];

const SharingToggles = ({
    circle,
    sharing,
}: {
    circle: CercleCircleDetail;
    sharing: CercleSharing;
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const myUsername = useCurrentServer()?.username;

    const update = useMutation({
        mutationFn: (patch: Partial<CercleSharing>) => cercleApi.setSharing(circle.id, patch),
        onError: (error) => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.circle(circle.id) });
            toast.error({ message: getCercleErrorMessage(error, t) });
        },
        onMutate: (patch) => {
            queryClient.setQueryData<CercleCircleDetail>(cercleKeys.circle(circle.id), (data) =>
                data
                    ? {
                          ...data,
                          members: data.members.map((m) =>
                              m.user.username === myUsername
                                  ? { ...m, sharing: { ...sharing, ...m.sharing, ...patch } }
                                  : m,
                          ),
                      }
                    : data,
            );
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.feed() });
            void queryClient.invalidateQueries({ queryKey: cercleKeys.live() });
        },
    });

    return (
        <CercleSection title={t('cercle.circles.mySharing')}>
            <CercleCard>
                <Stack gap="md">
                    {SHARING_KEYS.map((key) => (
                        <Switch
                            checked={sharing[key]}
                            description={t(`cercle.sharing.${key}Help`)}
                            key={key}
                            label={t(`cercle.sharing.${key}`)}
                            onChange={(e) => update.mutate({ [key]: e.currentTarget.checked })}
                        />
                    ))}
                </Stack>
            </CercleCard>
        </CercleSection>
    );
};

const MemberRow = ({
    canManage,
    circle,
    isOwner,
    member,
}: {
    canManage: boolean;
    circle: CercleCircleDetail;
    isOwner: boolean;
    member: CercleMember;
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const myUsername = useCurrentServer()?.username;
    const isMe = member.user.username === myUsername;

    const setRole = useMutation({
        mutationFn: (role: CercleRole) =>
            cercleApi.setMemberRole(circle.id, member.user.username, role),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.circle(circle.id) });
            void queryClient.invalidateQueries({ queryKey: cercleKeys.circles() });
        },
    });

    const remove = useMutation({
        mutationFn: () => cercleApi.removeMember(circle.id, member.user.username),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: cercleKeys.circle(circle.id) }),
    });

    const showMenu =
        !isMe && member.role !== 'owner' && (isOwner || (canManage && member.role === 'member'));

    return (
        <div className={styles.listRow}>
            <UserAvatar size={32} user={member.user} />
            <div className={styles.grow}>
                <Link
                    className={styles.link}
                    to={`/cercle/stats/user/${encodeURIComponent(member.user.username)}`}
                >
                    <Text fw={500} size="sm">
                        {member.user.display_name}
                        {isMe ? ` (${t('cercle.common.you')})` : ''}
                    </Text>
                </Link>
                <Text isMuted size="xs">
                    {t('cercle.circles.joinedOn', { date: formatDateAbsolute(member.joined_at) })}
                </Text>
            </div>
            {member.role !== 'member' ? (
                <Badge variant="outline">{t(`cercle.roles.${member.role}`)}</Badge>
            ) : null}
            {showMenu ? (
                <DropdownMenu position="bottom-end">
                    <DropdownMenu.Target>
                        <ActionIcon
                            aria-label={t('cercle.common.more')}
                            icon="ellipsisVertical"
                            variant="subtle"
                        />
                    </DropdownMenu.Target>
                    <DropdownMenu.Dropdown>
                        {isOwner && member.role === 'member' ? (
                            <DropdownMenu.Item onClick={() => setRole.mutate('admin')}>
                                {t('cercle.circles.makeAdmin')}
                            </DropdownMenu.Item>
                        ) : null}
                        {isOwner && member.role === 'admin' ? (
                            <DropdownMenu.Item onClick={() => setRole.mutate('member')}>
                                {t('cercle.circles.makeMember')}
                            </DropdownMenu.Item>
                        ) : null}
                        {isOwner ? (
                            <DropdownMenu.Item
                                onClick={() =>
                                    confirmCercleAction({
                                        message: t('cercle.circles.transferConfirm', {
                                            name: member.user.display_name,
                                        }),
                                        onConfirm: () => setRole.mutate('owner'),
                                        title: t('cercle.circles.transfer'),
                                    })
                                }
                            >
                                {t('cercle.circles.transfer')}
                            </DropdownMenu.Item>
                        ) : null}
                        <DropdownMenu.Divider />
                        <DropdownMenu.Item
                            onClick={() =>
                                confirmCercleAction({
                                    message: t('cercle.circles.removeConfirm', {
                                        name: member.user.display_name,
                                    }),
                                    onConfirm: () => remove.mutate(),
                                    title: t('cercle.circles.remove'),
                                })
                            }
                        >
                            {t('cercle.circles.remove')}
                        </DropdownMenu.Item>
                    </DropdownMenu.Dropdown>
                </DropdownMenu>
            ) : null}
        </div>
    );
};

const InviteRow = ({ circleId, invite }: { circleId: string; invite: CercleInvite }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const link = getInviteLink(invite.url_path || `/cercle/join/${invite.code}`);

    const remove = useMutation({
        mutationFn: () => cercleApi.deleteInvite(circleId, invite.code),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: cercleKeys.invites(circleId) }),
    });

    return (
        <div className={styles.listRow}>
            <div className={styles.grow}>
                <Text fw={500} overflow="hidden" size="sm">
                    {invite.code}
                </Text>
                <Text isMuted size="xs">
                    {invite.max_uses
                        ? t('cercle.invites.usesOf', { max: invite.max_uses, uses: invite.uses })
                        : t('cercle.invites.uses', { count: invite.uses })}
                    {' - '}
                    {invite.expires_at
                        ? t('cercle.invites.expires', {
                              when: formatDateRelative(invite.expires_at),
                          })
                        : t('cercle.invites.noExpiry')}
                </Text>
            </div>
            <CopyButton timeout={2000} value={link}>
                {({ copied, copy }) => (
                    <Button
                        leftSection={<Icon icon={copied ? 'check' : 'link'} />}
                        onClick={copy}
                        size="compact-sm"
                        variant="default"
                    >
                        {copied ? t('cercle.invites.copied') : t('cercle.invites.copyLink')}
                    </Button>
                )}
            </CopyButton>
            <ActionIcon
                aria-label={t('cercle.common.delete')}
                icon="delete"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
                variant="subtle"
            />
        </div>
    );
};

const Invites = ({ circleId }: { circleId: string }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const invites = useQuery(cercleQueries.invites(circleId));
    const [expires, setExpires] = useState('168');
    const [maxUses, setMaxUses] = useState('0');

    const create = useMutation({
        mutationFn: () =>
            cercleApi.createInvite(circleId, {
                expires_in_hours: Number(expires),
                max_uses: Number(maxUses),
            }),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.invites(circleId) });
            toast.success({ message: t('cercle.invites.created') });
        },
    });

    return (
        <CercleSection title={t('cercle.invites.title')}>
            <CercleCard>
                <Group align="flex-end" gap="sm">
                    <Select
                        data={[
                            { label: t('cercle.invites.hours', { count: 24 }), value: '24' },
                            { label: t('cercle.invites.days', { count: 7 }), value: '168' },
                            { label: t('cercle.invites.days', { count: 30 }), value: '720' },
                        ]}
                        label={t('cercle.invites.validFor')}
                        onChange={(v) => setExpires(v || '168')}
                        size="xs"
                        value={expires}
                        width="9rem"
                    />
                    <Select
                        data={[
                            { label: t('cercle.invites.unlimited'), value: '0' },
                            { label: '1', value: '1' },
                            { label: '5', value: '5' },
                            { label: '10', value: '10' },
                            { label: '25', value: '25' },
                        ]}
                        label={t('cercle.invites.maxUses')}
                        onChange={(v) => setMaxUses(v || '0')}
                        size="xs"
                        value={maxUses}
                        width="9rem"
                    />
                    <Button
                        leftSection={<Icon icon="add" />}
                        loading={create.isPending}
                        onClick={() => create.mutate()}
                        size="compact-md"
                        variant="filled"
                    >
                        {t('cercle.invites.create')}
                    </Button>
                </Group>
                {invites.isPending ? <CercleSkeleton count={1} height={40} /> : null}
                <div className={styles.list}>
                    {(invites.data?.items || []).map((invite) => (
                        <InviteRow circleId={circleId} invite={invite} key={invite.code} />
                    ))}
                </div>
            </CercleCard>
        </CercleSection>
    );
};

const CircleDetailContent = () => {
    const { t } = useTranslation();
    const { circleId = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const server = useCurrentServer();
    const circle = useQuery(cercleQueries.circle(circleId));
    const me = useQuery(cercleQueries.me());

    const leave = useMutation({
        mutationFn: () => cercleApi.leaveCircle(circleId),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.all });
            navigate('/cercle/circles');
        },
    });

    const remove = useMutation({
        mutationFn: () => cercleApi.deleteCircle(circleId),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: cercleKeys.all });
            navigate('/cercle/circles');
        },
    });

    const join = useMutation({
        mutationFn: () => cercleApi.joinCircle(circleId),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: cercleKeys.all }),
    });

    if (circle.isPending) {
        return <CercleSkeleton count={4} />;
    }

    if (circle.isError) {
        return (
            <EmptyState
                action={
                    circleId === 'everyone' ? (
                        <Button
                            loading={join.isPending}
                            onClick={() => join.mutate()}
                            variant="filled"
                        >
                            {t('cercle.circles.join')}
                        </Button>
                    ) : (
                        <Button component={Link} to="/cercle/circles" variant="default">
                            {t('cercle.nav.circles')}
                        </Button>
                    )
                }
                icon="group"
                message={getCercleErrorMessage(circle.error, t)}
                title={t('cercle.circles.notMember')}
            />
        );
    }

    const data = circle.data;
    const isEveryone = data.kind === 'everyone';
    const myMember = data.members.find((m) => m.user.username === server?.username);
    const role = data.my_role || myMember?.role || null;
    const isOwner = role === 'owner';
    const canManage = role === 'owner' || role === 'admin';
    const canEdit = isEveryone ? Boolean(me.data?.is_admin) : canManage;
    const sharing: CercleSharing = {
        share_discoveries: true,
        share_history: true,
        share_live: true,
        share_stats: true,
        ...myMember?.sharing,
    };

    const roleOrder: Record<string, number> = { admin: 1, member: 2, owner: 0 };
    const members = [...data.members].sort(
        (a, b) =>
            (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3) ||
            a.user.display_name.localeCompare(b.user.display_name),
    );

    return (
        <>
            <CercleCard>
                <div className={styles.row}>
                    <div className={styles.grow}>
                        <Text fw={700} size="xl">
                            {isEveryone ? t('cercle.circles.everyone') : data.name}
                        </Text>
                        <Text isMuted size="sm">
                            {data.description ||
                                (isEveryone ? t('cercle.circles.everyoneDescription') : '')}
                        </Text>
                    </div>
                    {canEdit ? (
                        <Button
                            leftSection={<Icon icon="edit" />}
                            onClick={() =>
                                openModal({
                                    children: <CircleForm circle={data} />,
                                    title: t('cercle.circles.edit'),
                                })
                            }
                            size="compact-sm"
                            variant="default"
                        >
                            {t('cercle.common.edit')}
                        </Button>
                    ) : null}
                </div>
                <Group gap="xs">
                    <Button
                        component={Link}
                        leftSection={<Icon icon="cercle" />}
                        size="compact-sm"
                        to={`/cercle?circle=${encodeURIComponent(data.id)}`}
                        variant="subtle"
                    >
                        {t('cercle.nav.feed')}
                    </Button>
                    <Button
                        component={Link}
                        leftSection={<Icon icon="chart" />}
                        size="compact-sm"
                        to={`/cercle/stats/circle/${encodeURIComponent(data.id)}`}
                        variant="subtle"
                    >
                        {t('cercle.nav.stats')}
                    </Button>
                    <Button
                        component={Link}
                        leftSection={<Icon icon="headphones" />}
                        size="compact-sm"
                        to={`/cercle/rooms?circle=${encodeURIComponent(data.id)}`}
                        variant="subtle"
                    >
                        {t('cercle.nav.rooms')}
                    </Button>
                </Group>
            </CercleCard>

            <SharingToggles circle={data} sharing={sharing} />

            <CercleSection title={t('cercle.circles.memberCount', { count: data.members.length })}>
                <CercleCard>
                    <div className={styles.list}>
                        {members.map((member) => (
                            <MemberRow
                                canManage={canManage}
                                circle={data}
                                isOwner={isOwner}
                                key={member.user.username}
                                member={member}
                            />
                        ))}
                    </div>
                </CercleCard>
            </CercleSection>

            {canManage && !isEveryone ? <Invites circleId={data.id} /> : null}

            <Group gap="sm">
                <Button
                    leftSection={<Icon icon="signOut" />}
                    loading={leave.isPending}
                    onClick={() =>
                        confirmCercleAction({
                            confirmLabel: t('cercle.circles.leave'),
                            message: isEveryone
                                ? t('cercle.circles.leaveEveryoneConfirm')
                                : t('cercle.circles.leaveConfirm'),
                            onConfirm: () => leave.mutate(),
                            title: t('cercle.circles.leave'),
                        })
                    }
                    variant="default"
                >
                    {t('cercle.circles.leave')}
                </Button>
                {isOwner && !isEveryone ? (
                    <Button
                        leftSection={<Icon icon="delete" />}
                        loading={remove.isPending}
                        onClick={() =>
                            confirmCercleAction({
                                confirmLabel: t('cercle.common.delete'),
                                message: t('cercle.circles.deleteConfirm'),
                                onConfirm: () => remove.mutate(),
                                title: t('cercle.circles.delete'),
                            })
                        }
                        variant="state-error"
                    >
                        {t('cercle.circles.delete')}
                    </Button>
                ) : null}
            </Group>
        </>
    );
};

const CircleDetailRoute = () => {
    const { t } = useTranslation();
    return (
        <CerclePage title={t('cercle.nav.circles')}>
            <CircleDetailContent />
        </CerclePage>
    );
};

export default CircleDetailRoute;
