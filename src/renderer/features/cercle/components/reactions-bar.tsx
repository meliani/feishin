import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './reactions-bar.module.css';

import { cercleApi } from '/@/renderer/features/cercle/api/cercle-api';
import { replaceFeedItem } from '/@/renderer/features/cercle/api/cercle-cache';
import { CercleFeedItem, CercleReaction } from '/@/renderer/features/cercle/api/cercle-types';
import { getCercleErrorMessage } from '/@/renderer/features/cercle/components/cercle-gate';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';

export const QUICK_REACTIONS = ['❤️', '🔥', '👍', '😂', '😮', '🎶'];

const firstGrapheme = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        const first = segmenter.segment(trimmed)[Symbol.iterator]().next();
        return first.done ? '' : first.value.segment;
    }

    return Array.from(trimmed)[0] || '';
};

const toggleLocal = (reactions: CercleReaction[], emoji: string, on: boolean) => {
    const existing = reactions.find((r) => r.emoji === emoji);
    if (on) {
        if (existing) {
            return reactions.map((r) =>
                r.emoji === emoji && !r.mine ? { ...r, count: r.count + 1, mine: true } : r,
            );
        }
        return [...reactions, { count: 1, emoji, mine: true }];
    }

    return reactions
        .map((r) => (r.emoji === emoji && r.mine ? { ...r, count: r.count - 1, mine: false } : r))
        .filter((r) => r.count > 0);
};

export const ReactionsBar = ({ item }: { item: CercleFeedItem }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [custom, setCustom] = useState('');

    const mutation = useMutation({
        mutationFn: ({ emoji, on }: { emoji: string; on: boolean }) =>
            cercleApi.react(item.id, emoji, on),
        onError: (error) => {
            replaceFeedItem(queryClient, item);
            toast.error({ message: getCercleErrorMessage(error, t) });
        },
        onMutate: ({ emoji, on }) => {
            replaceFeedItem(queryClient, {
                ...item,
                reactions: toggleLocal(item.reactions, emoji, on),
            });
        },
        onSuccess: (updated) => {
            if (updated && updated.id) {
                replaceFeedItem(queryClient, updated);
            }
        },
    });

    const react = (emoji: string) => {
        if (!emoji) {
            return;
        }
        const mine = item.reactions.some((r) => r.emoji === emoji && r.mine);
        mutation.mutate({ emoji, on: !mine });
        setPickerOpen(false);
        setCustom('');
    };

    return (
        <Group gap={6} wrap="wrap">
            {item.reactions.map((reaction) => (
                <button
                    aria-pressed={reaction.mine}
                    className={clsx(styles.pill, { [styles.mine]: reaction.mine })}
                    key={reaction.emoji}
                    onClick={() => react(reaction.emoji)}
                    type="button"
                >
                    <span className={styles.emoji}>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                </button>
            ))}
            <Popover onChange={setPickerOpen} opened={pickerOpen} position="top-start" withArrow>
                <Popover.Target>
                    <ActionIcon
                        aria-label={t('cercle.feed.addReaction')}
                        icon="emojiAdd"
                        onClick={() => setPickerOpen((open) => !open)}
                        size="sm"
                        tooltip={{ label: t('cercle.feed.addReaction') }}
                        variant="subtle"
                    />
                </Popover.Target>
                <Popover.Dropdown>
                    <Stack gap="xs">
                        <Group gap={4} wrap="nowrap">
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    className={styles.quick}
                                    key={emoji}
                                    onClick={() => react(emoji)}
                                    type="button"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </Group>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                react(firstGrapheme(custom));
                            }}
                        >
                            <Group gap="xs" wrap="nowrap">
                                <TextInput
                                    aria-label={t('cercle.feed.otherEmoji')}
                                    maxLength={16}
                                    onChange={(e) => setCustom(e.currentTarget.value)}
                                    placeholder={t('cercle.feed.otherEmoji')}
                                    size="xs"
                                    value={custom}
                                    width="9rem"
                                />
                                <Button
                                    disabled={!firstGrapheme(custom)}
                                    size="compact-sm"
                                    type="submit"
                                    variant="default"
                                >
                                    {t('cercle.common.add')}
                                </Button>
                            </Group>
                        </form>
                    </Stack>
                </Popover.Dropdown>
            </Popover>
        </Group>
    );
};
