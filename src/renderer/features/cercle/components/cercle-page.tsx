import { ReactNode } from 'react';

import styles from './cercle-page.module.css';

import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { CercleGate } from '/@/renderer/features/cercle/components/cercle-gate';
import { CercleNav } from '/@/renderer/features/cercle/components/cercle-nav';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';

interface CerclePageProps {
    actions?: ReactNode;
    children: ReactNode;
    // The settings page must stay reachable when the hub is misconfigured.
    gated?: boolean;
    title: string;
}

export const CerclePage = ({ actions, children, gated = true, title }: CerclePageProps) => (
    <PageErrorBoundary>
        <AnimatedPage>
            <PageHeader>
                <LibraryHeaderBar ignoreMaxWidth>
                    <LibraryHeaderBar.Title>{title}</LibraryHeaderBar.Title>
                </LibraryHeaderBar>
                {actions ? (
                    <Group gap="xs" wrap="nowrap">
                        {actions}
                    </Group>
                ) : null}
            </PageHeader>
            <FilterBar>
                <CercleNav />
            </FilterBar>
            <ScrollArea>
                <div className={styles.content}>
                    {gated ? <CercleGate>{children}</CercleGate> : children}
                </div>
            </ScrollArea>
        </AnimatedPage>
    </PageErrorBoundary>
);

interface CercleSectionProps {
    action?: ReactNode;
    children: ReactNode;
    title: ReactNode;
}

export const CercleSection = ({ action, children, title }: CercleSectionProps) => (
    <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

export const CercleCard = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => <div className={className ? `${styles.card} ${className}` : styles.card}>{children}</div>;
