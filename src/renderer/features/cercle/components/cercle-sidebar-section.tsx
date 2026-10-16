import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import styles from './cercle-sidebar-section.module.css';

import '/@/renderer/features/cercle/i18n/cercle-i18n';
import {
    isCercleHomeEnabled,
    isCercleSimpleEnabled,
} from '/@/renderer/features/cercle/utils/cercle-env';
import { CollapsedSidebarItem } from '/@/renderer/features/sidebar/components/collapsed-sidebar-item';
import { SidebarItem } from '/@/renderer/features/sidebar/components/sidebar-item';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { Group } from '/@/shared/components/group/group';
import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';

const ITEMS: { icon: keyof typeof AppIcon; key: string; to: string }[] = [
    { icon: 'cercle', key: 'feed', to: '/cercle' },
    { icon: 'live', key: 'live', to: '/cercle/live' },
    { icon: 'chart', key: 'stats', to: '/cercle/stats' },
    { icon: 'headphones', key: 'rooms', to: '/cercle/rooms' },
    { icon: 'group', key: 'circles', to: '/cercle/circles' },
];

// Sidebars mount this twice: once above the library (used when CERCLE_HOME=true makes Cercle the
// landing page) and once below it (default). Only the matching placement renders.
type Placement = 'default' | 'top';

const isPlacementActive = (placement: Placement) => (placement === 'top') === isCercleHomeEnabled();

// One accordion section in the expanded and mobile sidebars. Kept out of the user-sortable
// sidebarItems setting so upstream settings migrations never have to know about it.
export const CercleSidebarSection = ({ placement = 'default' }: { placement?: Placement }) => {
    const { t } = useTranslation();

    if (!isPlacementActive(placement)) {
        return null;
    }

    // Simple layout: one entry, the Cercle pages carry their own tabs.
    if (isCercleSimpleEnabled()) {
        return (
            <SidebarItem className={styles.single} to="/cercle">
                <Group gap="md">
                    <Icon icon="cercle" size="lg" />
                    {t('cercle.title')}
                </Group>
            </SidebarItem>
        );
    }

    return (
        <Accordion.Item value="cercle">
            <Accordion.Control>
                <Text fw={500} variant="secondary">
                    {t('cercle.title')}
                </Text>
            </Accordion.Control>
            <Accordion.Panel>
                {ITEMS.map((item) => (
                    <SidebarItem key={item.to} to={item.to}>
                        <Group gap="md">
                            <Icon icon={item.icon} size="lg" />
                            {t(`cercle.nav.${item.key}`)}
                        </Group>
                    </SidebarItem>
                ))}
            </Accordion.Panel>
        </Accordion.Item>
    );
};

export const CercleCollapsedSidebarItem = ({
    placement = 'default',
}: {
    placement?: Placement;
}) => {
    const { t } = useTranslation();

    if (!isPlacementActive(placement)) {
        return null;
    }

    return (
        <CollapsedSidebarItem
            activeIcon={<Icon color="primary" icon="cercle" size="25" />}
            component={NavLink}
            icon={<Icon icon="cercle" size="25" />}
            label={t('cercle.title')}
            route="/cercle/*"
            to="/cercle"
        />
    );
};
