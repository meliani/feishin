import { CSSProperties } from 'react';

import styles from './user-avatar.module.css';

import { CercleUser } from '/@/renderer/features/cercle/api/cercle-types';
import { getInitials, getUserHue } from '/@/renderer/features/cercle/utils/cercle-format';

interface UserAvatarProps {
    size?: number;
    user: Pick<CercleUser, 'display_name' | 'username'>;
}

export const UserAvatar = ({ size = 32, user }: UserAvatarProps) => {
    const style = {
        '--cercle-avatar-hue': getUserHue(user.username),
        fontSize: Math.max(10, Math.round(size * 0.4)),
        height: size,
        width: size,
    } as CSSProperties;

    return (
        <span
            aria-label={user.display_name || user.username}
            className={styles.avatar}
            role="img"
            style={style}
            title={user.display_name || user.username}
        >
            {getInitials(user.display_name || user.username)}
        </span>
    );
};
