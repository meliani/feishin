import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './circle-chips.module.css';

import { CercleCircle } from '/@/renderer/features/cercle/api/cercle-types';

interface CircleChipsProps {
    circles: CercleCircle[];
    includeAll?: boolean;
    onChange: (circleId: string) => void;
    value: string;
}

export const CircleChips = ({ circles, includeAll = true, onChange, value }: CircleChipsProps) => {
    const { t } = useTranslation();
    const options = [
        ...(includeAll ? [{ id: '', name: t('cercle.feed.allCircles') }] : []),
        ...circles.map((circle) => ({
            id: circle.id,
            name: circle.kind === 'everyone' ? t('cercle.circles.everyone') : circle.name,
        })),
    ];

    return (
        <div className={styles.chips} role="tablist">
            {options.map((option) => (
                <button
                    aria-selected={option.id === value}
                    className={clsx(styles.chip, { [styles.active]: option.id === value })}
                    key={option.id || 'all'}
                    onClick={() => onChange(option.id)}
                    role="tab"
                    type="button"
                >
                    {option.name}
                </button>
            ))}
        </div>
    );
};
