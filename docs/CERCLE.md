# Cercle module

This fork of [Feishin](https://github.com/jeffvli/feishin) adds **Cercle**, a self-hosted social
layer for Navidrome: people see what their circles are listening to, react and comment, compare
stats, get a yearly Wrapped and listen together in rooms. Everything is opt-out per circle.

The player module talks to a separate **cercle-hub** service (REST `/api/v1` + WebSocket
`/api/v1/ws`). Live listening data reaches the hub through a Navidrome plugin, not through
Feishin; the player only reads from the hub and, in a listening room, publishes the host's
playback state.

All module code lives in `src/renderer/features/cercle/`:

| Folder | Content |
|---|---|
| `api/` | hub types, HTTP client (session login, re-login on 401), query keys/options, WebSocket client (reconnect with backoff), cache merging of live events, song lookups |
| `components/` | page shell and nav, feed card, reactions, comments, live cards, charts (hand-rolled SVG), sidebar section, global hook, "Hide from Cercle" menu entry |
| `hooks/` | play/listen-along helpers, listen-together sync |
| `routes/` | `/cercle/*` pages: feed, live, stats, compare, wrapped, circles, circle detail, join, rooms, room, privacy |
| `store/` | persisted hub URL setting and hub session tokens, active room |
| `i18n/` | English and French strings, registered with `i18n.addResourceBundle` |

## Environment variables (web image)

All are optional and empty by default; they are written into `settings.js` at container start.

| Variable | Values | Effect |
|---|---|---|
| `CERCLE_HUB_URL` | URL or path (`/hub`) | Hub address, see below. |
| `CERCLE_SSO_LOGIN` | `true` / empty | Sign in without a password through a reverse proxy that authenticates users for Navidrome (Navidrome `ExtAuth`). Needs `SERVER_LOCK=true`, `SERVER_TYPE=navidrome`, and Navidrome reachable from the browser with the proxy cookie (same site). |
| `CERCLE_HOME` | `true` / empty | Open on the Cercle feed instead of the Feishin home page (first visit to `/` per page load) and show the Cercle sidebar section above the library. |
| `CERCLE_SIMPLE` | `true` / empty | Short, Spotify-like layout: the sidebar shows one **Cercle** entry, then Home, Favorites, Albums, Artists and the playlists; the home page keeps recently played, recently added, most played, random and playlists; star ratings are hidden. Applied once per browser as ordinary settings (`features/cercle/simple/`), so people can turn anything back on in Settings. |
| `FS_GENERAL_LANGUAGE` | e.g. `fr` | Upstream Feishin setting: default UI language on first run. Cercle ships English and French. |

### Single sign-on (`CERCLE_SSO_LOGIN`)

When Navidrome sits behind an authenticating reverse proxy and trusts its user header
(`ExtAuth.TrustedSources` + `ExtAuth.UserHeader`), Navidrome's own UI index (`{SERVER_URL}/app/`)
embeds `window.__APP_CONFIG__`, whose `auth` member mirrors a password login (Subsonic
salt/token, and on older Navidrome versions a JWT). With `CERCLE_SSO_LOGIN=true` the login screen
first fetches that page with the browser's cookies, reads `auth`, and stores the server entry
exactly as a password login would, so the form is never shown. Navidrome 0.64 leaves the JWT out:
the native API is then authenticated by the proxy's user header alone, the entry stores the
placeholder `cercle-proxy-session` instead of a JWT, and no bearer header is sent. On HTTP 401
(proxy session or JWT expired) the same request renews the session silently and replays the call. If the proxy session is gone or the page has no
`auth`, the normal password form appears with a short note. Code: `features/cercle/sso/`.

## Desktop builds (Windows, macOS Intel)

`.github/workflows/cercle-desktop.yml` builds the Electron app with `electron-builder-cercle.yml` (standalone copy of the
base config — `extends` would append the arm64 targets)
(Windows x64 NSIS installer + zip, macOS x64 dmg + zip — Intel Macs; the Apple Silicon runner
cross-builds x64) and publishes a GitHub release `cercle-desktop-v<version>-cercle.<run>`. Start it
by pushing a tag `cercle-desktop-*` (**Run workflow** in the Actions tab appears only once the
workflow is on the repository's default branch). The macOS build is ad-hoc
signed, not notarized (first launch: right-click → Open). Electron 43 needs macOS 12 or newer.

The build sets `MAIN_VITE_CERCLE_DESKTOP=true`, which turns the auto-updater off
(`src/main/env.ts`): upstream's updater checks upstream's releases and would replace the fork with
plain Feishin.

On the desktop, `CERCLE_SSO_LOGIN` does not apply. Behind an authenticating reverse proxy, add the
server as **OpenSubsonic** (the native Navidrome API sits behind the proxy login); the hub then needs
the desktop origin in `CERCLE_CORS_ORIGINS` (`null,file://`).

### One server built in (`vars.CERCLE_*`)

Desktop builds have no `settings.js`, so the workflow passes these **repository variables**
(Settings → Secrets and variables → Actions → Variables) to the renderer as `RENDERER_VITE_CERCLE_*`;
`features/cercle/desktop/cercle-desktop-defaults.ts` turns them into the same `window` switches the web
image uses, and turns on `SERVER_LOCK`. The installed app then opens on a login form for that one
server. All optional; with none set the build behaves like upstream.

| Variable | Example | Becomes |
|---|---|---|
| `CERCLE_SERVER_URL` | `https://music.example.com` | `SERVER_URL` (+ `SERVER_LOCK=true`) |
| `CERCLE_SERVER_NAME` | `Home` | `SERVER_NAME` |
| `CERCLE_SERVER_TYPE` | `subsonic` | `SERVER_TYPE` (`subsonic` = OpenSubsonic) |
| `CERCLE_HUB_URL` | | `CERCLE_HUB_URL` (default: server origin + `/hub`) |
| `CERCLE_HOME` | `true` | `CERCLE_HOME` |
| `CERCLE_SIMPLE` | `true` | `CERCLE_SIMPLE` |
| `CERCLE_LANGUAGE` | `fr` | `FS_GENERAL_LANGUAGE` |
| `CERCLE_DEVICE_LOGIN_URL` | `https://example.com/api/device` | `CERCLE_DEVICE_LOGIN_URL` (below) |

### Desktop sign-in through the browser (`CERCLE_DEVICE_LOGIN_URL`)

When set, the login form gets a **Sign in with the browser** button (`features/cercle/device/`). It is
a device flow against a small companion service you run next to the server (not part of this repo):

1. `POST {url}/start` → `{ device_code, user_code, verification_url, interval, expires_in }`. The app
   shows `user_code` and opens `verification_url` in the system browser.
2. There the person signs in (e.g. single sign-on in front of the server), checks the code and
   approves; the service attaches that person's music username and password to the request.
3. The app polls `POST {url}/poll {device_code}`: `202` pending, `200 { username, password }` once,
   `4xx` expired. It then logs in exactly as the password form would (and remembers the password).

`{url}` must answer CORS for the desktop origin (`Access-Control-Allow-Origin: *` is fine: the
`device_code` is the secret and nothing rides on cookies).

## Hub URL

Resolved in this order:

1. The **Hub address** field on the Cercle privacy page (stored in the `store_cercle` local store).
2. `window.CERCLE_HUB_URL`, injected by the web image's `settings.js` from the `CERCLE_HUB_URL`
   environment variable (empty by default).
3. `<origin of the current server URL>/hub`, e.g. `https://navidrome.example.com/hub`.

Relative values such as `/hub` resolve against the page origin. The hub must list the player's
origin in `CERCLE_CORS_ORIGINS` when it is served from another origin (desktop app included).

```yaml
services:
    feishin:
        image: ghcr.io/meliani/feishin-cercle:latest
        environment:
            SERVER_NAME: Music
            SERVER_TYPE: navidrome
            SERVER_URL: https://navidrome.example.com
            SERVER_LOCK: 'true'
            CERCLE_HUB_URL: https://navidrome.example.com/hub
            CERCLE_SSO_LOGIN: 'true'
            CERCLE_HOME: 'true'
            CERCLE_SIMPLE: 'true'
            FS_GENERAL_LANGUAGE: fr
            ANALYTICS_DISABLED: 'true'
        ports:
            - 9180:9180
```

Authentication reuses the Subsonic credential Feishin already holds for the current server
(`u`/`s`/`t`, or legacy `p`): it is sent once to `POST /api/v1/auth/session` and the returned hub
token is kept in the local store. Nothing else is sent to the hub; cover art always comes from the
user's own server. Jellyfin servers are not supported (the page says so). The WebSocket connects
only once a hub session exists, so users who never open Cercle never contact the hub.

## Upstream files touched

Kept to registration one-liners so rebases stay easy:

| File | Change |
|---|---|
| `src/renderer/router/app-router.tsx` | lazy import + `<Route path="/cercle/*">`; `HomeRoute` wrapped in `<CercleHomeRedirect>` |
| `src/renderer/features/login/routes/login-route.tsx` | login form wrapped in `<CercleSsoLogin>`; submit body extracted to `login()` and reused by `<CercleDeviceLogin>` under the button |
| `src/renderer/main.tsx` | first import: `features/cercle/desktop/cercle-desktop-defaults` (desktop builds only) |
| `src/renderer/api/navidrome/navidrome-api.ts` | `retryWithNavidromeSso` first in the 401 handler (no-op unless `CERCLE_SSO_LOGIN`) |
| `src/renderer/features/sidebar/components/sidebar.tsx` | `<CercleSidebarSection placement="top" />` above the library, `<CercleSidebarSection />` below it, `'cercle'` in accordion `defaultValue` |
| `src/renderer/features/sidebar/components/mobile-sidebar.tsx` | same |
| `src/renderer/features/sidebar/components/collapsed-sidebar.tsx` | `<CercleCollapsedSidebarItem />` (top and bottom placements) |
| `src/renderer/features/player/components/audio-players.tsx` | `<CercleHook />` next to `<ScrobbleHook />` |
| `src/renderer/features/context-menu/menus/{song,album,album-artist,artist}-context-menu.tsx` | `<HideFromCercleAction />` |
| `src/shared/components/icon/icon.tsx` | a few Lucide icons in `AppIcon` |
| `src/renderer/global.d.ts`, `settings.js.template`, `Dockerfile` | `CERCLE_HUB_URL`, `CERCLE_SSO_LOGIN`, `CERCLE_HOME`, `CERCLE_SIMPLE` |
| `src/renderer/index.html`, `features/analytics/hooks/use-analytics-disabled.ts`, `features/settings/components/advanced/analytics-settings.tsx` | usage analytics (upstream's Umami) are opt-in: off unless the person turns them on (`umami.enabled`); the switch is greyed out when the image sets `ANALYTICS_DISABLED` |
| `src/main/env.ts`, `electron-builder-cercle.yml`, `.github/workflows/cercle-desktop.yml` | desktop builds without the upstream auto-updater |
| `commitlint.config.mjs`, `docs/agents/commits.md` | `cercle` commit scope |
| `.github/workflows/cercle-docker.yml` | image build for this fork (new file) |

The sidebar entry is deliberately not part of the user-sortable `sidebarItems` setting, so
upstream settings migrations never need to know about it.

## Rebasing on upstream

```bash
git remote add upstream https://github.com/jeffvli/feishin.git   # once
git fetch upstream
git checkout cercle
git rebase upstream/development
# conflicts, if any, are in the one-line registrations listed above
pnpm install
pnpm run typecheck:web
pnpm exec eslint --max-warnings 0 src/renderer/features/cercle
pnpm exec stylelint "src/renderer/features/cercle/**/*.css"
git push --force-with-lease origin cercle
```

Things worth re-checking after an upstream bump: the player store actions used by
`hooks/use-room-sync.ts` (`setQueue`, `mediaSeekToTimestamp`, `subscribeCurrentTrack`, ...),
`usePlayer().addToQueueByData/addToQueueByFetch`, and the `ItemImage` props.
