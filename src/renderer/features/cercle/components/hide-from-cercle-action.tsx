import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { cercleApi, cercleKeys } from '/@/renderer/features/cercle/api/cercle-api';
import { CercleHiddenKind, CercleMe } from '/@/renderer/features/cercle/api/cercle-types';
import {
    getCercleErrorMessage,
    useCercleAvailability,
} from '/@/renderer/features/cercle/components/cercle-gate';
import '/@/renderer/features/cercle/i18n/cercle-i18n';
import { logger } from '/@/renderer/utils/logger';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { toast } from '/@/shared/components/toast/toast';

interface HideFromCercleActionProps {
    items: { id: string; name: string }[];
    kind: CercleHiddenKind;
}

// Context-menu entry: plays of these items stay private (contract section 1, hidden items).
export const HideFromCercleAction = ({ items, kind }: HideFromCercleActionProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { reason } = useCercleAvailability();

    if (reason || items.length === 0) {
        return null;
    }

    const onSelect = async () => {
        try {
            let settings: CercleMe['settings'] | undefined;
            for (const item of items) {
                settings = await cercleApi.addHidden({ id: item.id, kind, label: item.name });
            }
            if (settings) {
                const latest = settings;
                queryClient.setQueryData<CercleMe>(cercleKeys.me(), (me) =>
                    me ? { ...me, settings: latest } : me,
                );
            }
            toast.success({ message: t('cercle.privacy.hiddenAdded', { count: items.length }) });
        } catch (error) {
            logger.warn('Cercle hide failed', { error });
            toast.error({ message: getCercleErrorMessage(error, t) });
        }
    };

    return (
        <ContextMenu.Item leftIcon="visibilityOff" onSelect={onSelect}>
            {t('cercle.privacy.hideFromCercle')}
        </ContextMenu.Item>
    );
};
