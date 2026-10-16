// Cercle: usage analytics go to upstream's Umami instance, so they are opt-in. Nothing is sent
// unless the person turns them on in Settings → Advanced (stored as umami.enabled).
export const isAnalyticsEnvDisabled = () =>
    typeof window !== 'undefined' &&
    (window.ANALYTICS_DISABLED === true || window.ANALYTICS_DISABLED === 'true');

export const isAnalyticsDisabled = () => {
    const isSettingOptOut = localStorage.getItem('umami.enabled') !== '1';
    const isDevMode = process.env.NODE_ENV === 'development';

    return isSettingOptOut || isDevMode || isAnalyticsEnvDisabled();
};
