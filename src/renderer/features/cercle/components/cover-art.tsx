import clsx from 'clsx';

import styles from './cover-art.module.css';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { useCurrentServerId } from '/@/renderer/store/auth.store';
import { LibraryItem } from '/@/shared/types/domain-types';

interface CoverArtProps {
    className?: string;
    id?: null | string;
    itemType?: LibraryItem;
    onClick?: () => void;
    size?: number;
}

// Art always comes from the viewer's own server: the hub only shares ids.
export const CoverArt = ({
    className,
    id,
    itemType = LibraryItem.ALBUM,
    onClick,
    size = 64,
}: CoverArtProps) => {
    const serverId = useCurrentServerId();

    return (
        <div
            className={clsx(styles.cover, { [styles.clickable]: Boolean(onClick) }, className)}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
            role={onClick ? 'button' : undefined}
            style={{ height: size, width: size }}
            tabIndex={onClick ? 0 : undefined}
        >
            <ItemImage
                className={styles.image}
                id={id || undefined}
                itemType={itemType}
                serverId={serverId}
                size={size * 2}
            />
        </div>
    );
};
