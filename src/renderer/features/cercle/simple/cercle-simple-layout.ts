import { isCercleSimpleEnabled } from '/@/renderer/features/cercle/utils/cercle-env';
import {
    HomeItem,
    SidebarItem,
    SidebarItemType,
    SortableItem,
    useSettingsStore,
} from '/@/renderer/store/settings.store';

// CERCLE_SIMPLE: a short, Spotify-like layout — Home, Favorites, Albums, Artists and the playlists
// in the sidebar, a handful of home rows, no star ratings. It only changes ordinary settings, once
// per browser (bump the version to apply a new layout again); people can turn anything back on in
// Settings afterwards. Items upstream adds later keep their own defaults.
const LAYOUT_VERSION = '1';
const STORAGE_KEY = 'cercle.simpleLayout';

const SIDEBAR_SHOWN: string[] = [
    SidebarItem.HOME,
    SidebarItem.FAVORITES,
    SidebarItem.ALBUMS,
    SidebarItem.ARTISTS,
];

const SIDEBAR_HIDDEN: string[] = [
    SidebarItem.ARTISTS_ALL,
    SidebarItem.COLLECTIONS,
    SidebarItem.FOLDERS,
    SidebarItem.GENRES,
    SidebarItem.NOW_PLAYING,
    SidebarItem.PLAYLISTS,
    SidebarItem.RADIO,
    SidebarItem.SEARCH,
    SidebarItem.SETTINGS,
    SidebarItem.TRACKS,
];

const HOME_SHOWN: string[] = [
    HomeItem.RECENTLY_PLAYED,
    HomeItem.RECENTLY_ADDED,
    HomeItem.MOST_PLAYED,
    HomeItem.RANDOM,
    HomeItem.PLAYLISTS,
];

const HOME_HIDDEN: string[] = [HomeItem.GENRES, HomeItem.RECENTLY_RELEASED];

// Shown items first in the given order, everything else after them in its current order.
const simplify = <T extends { disabled: boolean; id: string }>(
    items: T[],
    shown: string[],
    hidden: string[],
): T[] => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const first = shown.flatMap((id) => {
        const item = byId.get(id);
        return item ? [{ ...item, disabled: false }] : [];
    });
    const rest = items
        .filter((item) => !shown.includes(item.id))
        .map((item) => (hidden.includes(item.id) ? { ...item, disabled: true } : item));
    return [...first, ...rest];
};

const readVersion = () => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return LAYOUT_VERSION;
    }
};

export const applyCercleSimpleLayout = () => {
    if (!isCercleSimpleEnabled() || readVersion() === LAYOUT_VERSION) {
        return;
    }

    const { actions, general } = useSettingsStore.getState();
    actions.setSidebarItems(
        simplify<SidebarItemType>(general.sidebarItems, SIDEBAR_SHOWN, SIDEBAR_HIDDEN),
    );
    actions.setHomeItems(
        simplify(general.homeItems, HOME_SHOWN, HOME_HIDDEN) as SortableItem<HomeItem>[],
    );
    actions.setSettings({ general: { showRatings: false, sidebarPlaylistList: true } });

    try {
        localStorage.setItem(STORAGE_KEY, LAYOUT_VERSION);
    } catch {
        // Private mode: applied again next time, which is harmless.
    }
};
