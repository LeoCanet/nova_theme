/** @odoo-module **/

const FAVORITE_APPS_KEY = "nova_favorite_apps";
const PINNED_PAGES_KEY = "nova_pinned_pages";

export function getFavoriteAppIds() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITE_APPS_KEY)) || [];
    } catch {
        return [];
    }
}

export function setFavoriteAppIds(ids) {
    localStorage.setItem(FAVORITE_APPS_KEY, JSON.stringify(ids));
}

export function getPinnedPages() {
    try {
        return JSON.parse(localStorage.getItem(PINNED_PAGES_KEY)) || [];
    } catch {
        return [];
    }
}

export function setPinnedPages(pages) {
    localStorage.setItem(PINNED_PAGES_KEY, JSON.stringify(pages));
}
