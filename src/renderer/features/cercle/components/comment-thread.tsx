import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './comment-thread.module.css';

import { cercleApi, cercleQueries } from '/@/renderer/features/cercle/api/cercle-api';
import {
    addComment,
    removeComment,
    updateComment,
} from '/@/renderer/features/cercle/api/cercle-cache';
import { CercleComment } from '/@/renderer/features/cercle/api/cercle-types';
import {
    CercleSkeleton,
    getCercleErrorMessage,
} from '/@/renderer/features/cercle/components/cercle-gate';
import { UserAvatar } from '/@/renderer/features/cercle/components/user-avatar';
import { useCurrentServer } from '/@/renderer/store/auth.store';
import { formatDateRelative } from '/@/renderer/utils/format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Text } from '/@/shared/components/text/text';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';

const MAX_LENGTH = 2000;

const CommentRow = ({ comment, itemId }: { comment: CercleComment; itemId: string }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const server = useCurrentServer();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.body);
    const isMine = server?.username === comment.user.username;

    const save = useMutation({
        mutationFn: () => cercleApi.editComment(comment.id, draft.trim()),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (updated) => {
            updateComment(queryClient, itemId, updated);
            setEditing(false);
        },
    });

    const remove = useMutation({
        mutationFn: () => cercleApi.deleteComment(comment.id),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: () => removeComment(queryClient, itemId, comment.id),
    });

    return (
        <div className={styles.comment}>
            <UserAvatar size={28} user={comment.user} />
            <div className={styles.body}>
                <Group gap="xs" wrap="nowrap">
                    <Text fw={600} size="sm">
                        {comment.user.display_name}
                    </Text>
                    <Text isMuted size="xs">
                        {formatDateRelative(comment.created_at)}
                        {comment.edited_at ? ` - ${t('cercle.feed.edited')}` : ''}
                    </Text>
                    {isMine && !editing ? (
                        <Group className={styles.actions} gap={2} wrap="nowrap">
                            <ActionIcon
                                aria-label={t('cercle.common.edit')}
                                icon="edit"
                                onClick={() => {
                                    setDraft(comment.body);
                                    setEditing(true);
                                }}
                                size="xs"
                                variant="subtle"
                            />
                            <ActionIcon
                                aria-label={t('cercle.common.delete')}
                                icon="delete"
                                loading={remove.isPending}
                                onClick={() => remove.mutate()}
                                size="xs"
                                variant="subtle"
                            />
                        </Group>
                    ) : null}
                </Group>
                {editing ? (
                    <div className={styles.editor}>
                        <Textarea
                            autosize
                            maxLength={MAX_LENGTH}
                            maxRows={8}
                            minRows={1}
                            onChange={(e) => setDraft(e.currentTarget.value)}
                            value={draft}
                        />
                        <Group gap="xs" justify="flex-end">
                            <Button
                                onClick={() => setEditing(false)}
                                size="compact-sm"
                                variant="subtle"
                            >
                                {t('cercle.common.cancel')}
                            </Button>
                            <Button
                                disabled={!draft.trim()}
                                loading={save.isPending}
                                onClick={() => save.mutate()}
                                size="compact-sm"
                                variant="filled"
                            >
                                {t('cercle.common.save')}
                            </Button>
                        </Group>
                    </div>
                ) : (
                    <Text className={styles.text} size="sm">
                        {comment.body}
                    </Text>
                )}
            </div>
        </div>
    );
};

export const CommentThread = ({ itemId }: { itemId: string }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const comments = useQuery(cercleQueries.comments(itemId));
    const [draft, setDraft] = useState('');

    const post = useMutation({
        mutationFn: () => cercleApi.postComment(itemId, draft.trim()),
        onError: (error) => toast.error({ message: getCercleErrorMessage(error, t) }),
        onSuccess: (comment) => {
            addComment(queryClient, itemId, comment);
            setDraft('');
        },
    });

    const submit = () => {
        if (draft.trim() && !post.isPending) {
            post.mutate();
        }
    };

    return (
        <div className={styles.thread}>
            {comments.isPending ? <CercleSkeleton count={2} height={40} /> : null}
            {comments.isError ? (
                <Text isMuted size="sm">
                    {getCercleErrorMessage(comments.error, t)}
                </Text>
            ) : null}
            {comments.data?.items.map((comment) => (
                <CommentRow comment={comment} itemId={itemId} key={comment.id} />
            ))}
            {comments.data && comments.data.items.length === 0 ? (
                <Text isMuted size="sm">
                    {t('cercle.feed.noComments')}
                </Text>
            ) : null}
            <div className={styles.composer}>
                <Textarea
                    aria-label={t('cercle.feed.writeComment')}
                    autosize
                    maxLength={MAX_LENGTH}
                    maxRows={6}
                    minRows={1}
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    placeholder={t('cercle.feed.writeComment')}
                    value={draft}
                />
                <Button
                    disabled={!draft.trim()}
                    loading={post.isPending}
                    onClick={submit}
                    size="compact-md"
                    variant="filled"
                >
                    {t('cercle.feed.send')}
                </Button>
            </div>
        </div>
    );
};
