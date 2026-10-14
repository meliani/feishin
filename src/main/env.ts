export const disableAutoUpdates = () => {
    // Cercle desktop builds set MAIN_VITE_CERCLE_DESKTOP at build time: the updater only knows the
    // upstream releases, which would replace this fork with plain Feishin.
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    return process.env['DISABLE_AUTO_UPDATES'] || env.MAIN_VITE_CERCLE_DESKTOP === 'true';
};

export const isMacOS = () => {
    return process.platform === 'darwin';
};

export const isWindows = () => {
    return process.platform === 'win32';
};

export const isLinux = () => {
    return process.platform === 'linux';
};
