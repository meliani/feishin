import isElectron from 'is-electron';

// Desktop builds have no settings.js, so a build can bake in the same switches the web image takes
// from its environment: RENDERER_VITE_CERCLE_SERVER_URL=https://music.example.com and friends make
// the installed app open on a login form for that one server (SERVER_LOCK), nothing to configure.
// Imported first by main.tsx: the settings store reads window.FS_* when it is created.

const env = import.meta.env as Record<string, string | undefined>;

const DEFAULTS: [string, string | undefined][] = [
    ['SERVER_URL', env.RENDERER_VITE_CERCLE_SERVER_URL],
    ['SERVER_NAME', env.RENDERER_VITE_CERCLE_SERVER_NAME],
    ['SERVER_TYPE', env.RENDERER_VITE_CERCLE_SERVER_TYPE],
    ['CERCLE_HUB_URL', env.RENDERER_VITE_CERCLE_HUB_URL],
    ['CERCLE_HOME', env.RENDERER_VITE_CERCLE_HOME],
    ['CERCLE_DEVICE_LOGIN_URL', env.RENDERER_VITE_CERCLE_DEVICE_LOGIN_URL],
    ['FS_GENERAL_LANGUAGE', env.RENDERER_VITE_CERCLE_LANGUAGE],
];

if (isElectron() && env.RENDERER_VITE_CERCLE_SERVER_URL) {
    const target = window as unknown as Record<string, string | undefined>;
    for (const [key, value] of DEFAULTS) {
        if (value && !target[key]) {
            target[key] = value;
        }
    }
    target.SERVER_LOCK = 'true';
}
