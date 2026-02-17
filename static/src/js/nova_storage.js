/** @odoo-module **/

import { registry } from "@web/core/registry";
import { session } from "@web/session";

const LEGACY_FAVORITES_KEY = "nova_favorite_apps";
const LEGACY_PINS_KEY = "nova_pinned_pages";

const novaStorageService = {
    dependencies: ["orm"],

    start(env, { orm }) {
        const novaTheme = session.nova_theme || {};
        let favoriteAppIds = Array.isArray(novaTheme.favorite_app_ids)
            ? [...novaTheme.favorite_app_ids]
            : [];
        let pinnedPages = Array.isArray(novaTheme.pinned_pages)
            ? [...novaTheme.pinned_pages]
            : [];

        // One-time migration from localStorage → DB
        _migrateLocalStorage(orm, favoriteAppIds, pinnedPages).then((migrated) => {
            if (migrated) {
                favoriteAppIds = migrated.favoriteAppIds;
                pinnedPages = migrated.pinnedPages;
            }
        });

        function _writeField(field, value) {
            orm.call(
                "res.users",
                "write",
                [[session.uid], { [field]: JSON.stringify(value) }]
            ).catch(() => {});
        }

        return {
            getFavoriteAppIds() {
                return favoriteAppIds;
            },
            setFavoriteAppIds(ids) {
                favoriteAppIds = ids;
                _writeField("nova_favorite_app_ids", ids);
            },
            getPinnedPages() {
                return pinnedPages;
            },
            setPinnedPages(pages) {
                pinnedPages = pages;
                _writeField("nova_pinned_pages", pages);
            },
        };
    },
};

async function _migrateLocalStorage(orm, currentFavorites, currentPins) {
    try {
        const legacyFavRaw = localStorage.getItem(LEGACY_FAVORITES_KEY);
        const legacyPinsRaw = localStorage.getItem(LEGACY_PINS_KEY);
        if (!legacyFavRaw && !legacyPinsRaw) {
            return null;
        }

        let migrated = false;
        const result = {
            favoriteAppIds: currentFavorites,
            pinnedPages: currentPins,
        };

        if (legacyFavRaw && currentFavorites.length === 0) {
            try {
                const ids = JSON.parse(legacyFavRaw);
                if (Array.isArray(ids) && ids.length > 0) {
                    result.favoriteAppIds = ids;
                    migrated = true;
                }
            } catch { /* invalid JSON, ignore */ }
        }

        if (legacyPinsRaw && currentPins.length === 0) {
            try {
                const pages = JSON.parse(legacyPinsRaw);
                if (Array.isArray(pages) && pages.length > 0) {
                    result.pinnedPages = pages;
                    migrated = true;
                }
            } catch { /* invalid JSON, ignore */ }
        }

        if (migrated) {
            const vals = {};
            if (result.favoriteAppIds !== currentFavorites) {
                vals.nova_favorite_app_ids = JSON.stringify(result.favoriteAppIds);
            }
            if (result.pinnedPages !== currentPins) {
                vals.nova_pinned_pages = JSON.stringify(result.pinnedPages);
            }
            if (Object.keys(vals).length > 0) {
                await orm.call("res.users", "write", [[session.uid], vals]);
            }
        }

        // Clean up localStorage regardless
        localStorage.removeItem(LEGACY_FAVORITES_KEY);
        localStorage.removeItem(LEGACY_PINS_KEY);

        return migrated ? result : null;
    } catch {
        return null;
    }
}

registry.category("services").add("novaStorage", novaStorageService);
