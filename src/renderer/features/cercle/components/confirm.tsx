import i18n from '/@/i18n/i18n';
import { closeAllModals, ConfirmModal, openModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';

interface ConfirmOptions {
    confirmLabel?: string;
    message: string;
    onConfirm: () => Promise<unknown> | void;
    title: string;
}

export const confirmCercleAction = ({
    confirmLabel,
    message,
    onConfirm,
    title,
}: ConfirmOptions) => {
    openModal({
        children: (
            <ConfirmModal
                labels={{
                    cancel: i18n.t('cercle.common.cancel'),
                    confirm: confirmLabel || i18n.t('cercle.common.confirm'),
                }}
                onConfirm={async () => {
                    closeAllModals();
                    await onConfirm();
                }}
            >
                <Text>{message}</Text>
            </ConfirmModal>
        ),
        title,
    });
};
