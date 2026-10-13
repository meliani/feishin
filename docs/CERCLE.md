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
| `src/renderer/router/app-router.tsx` | lazy import + `<Route path="/cercle/*">` |
| `src/renderer/features/sidebar/components/sidebar.tsx` | `<CercleSidebarSection />`, `'cercle'` in accordion `defaultValue` |
| `src/renderer/features/sidebar/components/mobile-sidebar.tsx` | same |
| `src/renderer/features/sidebar/components/collapsed-sidebar.tsx` | `<CercleCollapsedSidebarItem />` |
| `src/renderer/features/player/components/audio-players.tsx` | `<CercleHook />` next to `<ScrobbleHook />` |
| `src/renderer/features/context-menu/menus/{song,album,album-artist,artist}-context-menu.tsx` | `<HideFromCercleAction />` |
| `src/shared/components/icon/icon.tsx` | a few Lucide icons in `AppIcon` |
| `src/renderer/global.d.ts`, `settings.js.template`, `Dockerfile` | `CERCLE_HUB_URL` |
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
