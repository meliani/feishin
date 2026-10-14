// Browser sign-in for the desktop app (an OAuth-style device flow run by the server's companion
// service, see docs/CERCLE.md "Desktop sign-in through the browser"):
//   POST {base}/start -> { device_code, user_code, verification_url, interval, expires_in }
//   POST {base}/poll  { device_code } -> 202 pending | 200 { username, password } | 4xx gone
// The person opens verification_url in their browser, signs in there (single sign-on), checks
// that the code matches and approves; the app then receives the music password once.

export type DeviceLoginStart = {
    device_code: string;
    expires_in: number;
    interval: number;
    user_code: string;
    verification_url: string;
};

export type DeviceLoginResult =
    | { password: string; status: 'approved'; username: string }
    | { status: 'expired' }
    | { status: 'pending' };

export const getDeviceLoginBase = () => (window.CERCLE_DEVICE_LOGIN_URL || '').replace(/\/$/, '');

const post = (path: string, body: unknown) =>
    fetch(`${getDeviceLoginBase()}${path}`, {
        body: JSON.stringify(body),
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });

export const startDeviceLogin = async (): Promise<DeviceLoginStart> => {
    const response = await post('/start', { client: 'feishin-cercle' });
    if (!response.ok) {
        throw new Error(`device login start failed: ${response.status}`);
    }
    return response.json();
};

export const pollDeviceLogin = async (deviceCode: string): Promise<DeviceLoginResult> => {
    const response = await post('/poll', { device_code: deviceCode });
    if (response.status === 202) {
        return { status: 'pending' };
    }
    if (response.ok) {
        const data = await response.json();
        if (typeof data?.username === 'string' && typeof data?.password === 'string') {
            return { password: data.password, status: 'approved', username: data.username };
        }
    }
    if (response.status === 429 || response.status >= 500) {
        return { status: 'pending' }; // transient: keep waiting until the code expires
    }
    return { status: 'expired' };
};
