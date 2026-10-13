import { ReactNode } from 'react';

import styles from './empty-state.module.css';

import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

interface EmptyStateProps {
    action?: ReactNode;
    icon?: keyof typeof AppIcon;
    message?: string;
    title: string;
}

export const EmptyState = ({ action, icon = 'cercle', message, title }: EmptyStateProps) => (
    <Stack align="center" className={styles.empty} gap="sm">
        <Icon color="muted" icon={icon} size="4xl" />
        <Text fw={600} size="lg">
            {title}
        </Text>
        {message ? (
            <Text className={styles.message} isMuted size="sm">
                {message}
            </Text>
        ) : null}
        {action}
    </Stack>
);
