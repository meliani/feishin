import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { isAnalyticsEnvDisabled } from '/@/renderer/features/analytics/hooks/use-analytics-disabled';
import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { Switch } from '/@/shared/components/switch/switch';

export const AnalyticsSettings = memo(() => {
    const { t } = useTranslation();
    // The image turned analytics off for everyone (ANALYTICS_DISABLED): the switch would do nothing.
    const isEnvDisabled = isAnalyticsEnvDisabled();

    const handleSetSendAnalytics = (send: boolean) => {
        if (send) {
            localStorage.setItem('umami.enabled', '1');
        } else {
            localStorage.removeItem('umami.enabled');
        }
    };

    const analyticsOptions: SettingOption[] = [
        {
            control: (
                <Switch
                    aria-label={t('setting.analyticsEnable')}
                    defaultChecked={!isEnvDisabled && localStorage.getItem('umami.enabled') === '1'}
                    disabled={isEnvDisabled}
                    onChange={(e) => handleSetSendAnalytics(e.currentTarget.checked)}
                />
            ),
            description: t('setting.analyticsEnable_description'),
            title: t('setting.analyticsEnable'),
        },
    ];

    return <SettingsSection options={analyticsOptions} title={t('page.setting.analytics')} />;
});
