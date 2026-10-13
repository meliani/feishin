import isElectron from 'is-electron';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { ServerType, toServerType } from '/@/shared/types/types';

// Opt-in switches injected by the web image's settings.js (see docs/CERCLE.md).
const isEnvTrue = (value: boolean | string | undefined) => value === true || value === 'true';

// Start on the Cercle feed instead of the Feishin home page, with its sidebar section on top.
export const isCercleHomeEnabled = () =>
    typeof window !== 'undefined' && isEnvTrue(window.CERCLE_HOME);

// Sign in through Navidrome's reverse-proxy authentication instead of the password form.
// Only meaningful for the web build locked to one Navidrome server.
export const isCercleSsoEnabled = () =>
    typeof window !== 'undefined' &&
    !isElectron() &&
    isEnvTrue(window.CERCLE_SSO_LOGIN) &&
    isServerLock() &&
    Boolean(window.SERVER_URL) &&
    (window.SERVER_TYPE ? toServerType(window.SERVER_TYPE) : null) === ServerType.NAVIDROME;
