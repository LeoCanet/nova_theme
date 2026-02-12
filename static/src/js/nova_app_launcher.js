/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";
import { getFavoriteAppIds, setFavoriteAppIds } from "./nova_storage";

export class NovaAppLauncher extends Component {
    setup() {
        this.menuService = useService("menu");
        this.hotkeyService = useService("hotkey");
        this.searchInput = useRef("novaSearchInput");
        this.state = useState({
            isOpen: false,
            searchQuery: "",
            _menuVersion: 0,
            favoriteAppIds: getFavoriteAppIds(),
        });

        this._boundToggle = this._onToggle.bind(this);
        this._boundRefreshApps = this._refreshApps.bind(this);
        this._boundOnFavoritesChanged = () => {
            this.state.favoriteAppIds = getFavoriteAppIds();
        };
        this._removeHotkey = this.hotkeyService.add("h", () => this._onToggle());

        onMounted(() => {
            this.env.bus.addEventListener("NOVA:TOGGLE-LAUNCHER", this._boundToggle);
            this.env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", this._boundRefreshApps);
            this.env.bus.addEventListener("NOVA:FAVORITES-CHANGED", this._boundOnFavoritesChanged);
        });

        onWillUnmount(() => {
            this.env.bus.removeEventListener("NOVA:TOGGLE-LAUNCHER", this._boundToggle);
            this.env.bus.removeEventListener("ACTION_MANAGER:UI-UPDATED", this._boundRefreshApps);
            this.env.bus.removeEventListener("NOVA:FAVORITES-CHANGED", this._boundOnFavoritesChanged);
            if (this._removeHotkey) {
                this._removeHotkey();
            }
        });
    }

    _onToggle() {
        this.state.isOpen = !this.state.isOpen;
        this.state.searchQuery = "";
        if (this.state.isOpen) {
            setTimeout(() => {
                if (this.searchInput && this.searchInput.el) {
                    this.searchInput.el.focus();
                }
            }, 50);
        }
    }

    close() {
        this.state.isOpen = false;
        this.state.searchQuery = "";
    }

    onOverlayClick(ev) {
        if (ev.target === ev.currentTarget) {
            this.close();
        }
    }

    onSearch(ev) {
        this.state.searchQuery = ev.target.value.toLowerCase().trim();
    }

    onSearchKeydown(ev) {
        if (ev.key === "Escape") {
            this.close();
        }
    }

    getAppIconSrc(app) {
        return `/web/image?model=ir.ui.menu&id=${app.id}&field=web_icon_data`;
    }

    _refreshApps() {
        this.state._menuVersion++;
    }

    get filteredApps() {
        void this.state._menuVersion;
        const apps = this.menuService.getApps();
        if (!this.state.searchQuery) {
            return apps;
        }
        return apps.filter((app) =>
            app.name.toLowerCase().includes(this.state.searchQuery)
        );
    }

    openApp(app) {
        this.menuService.selectMenu(app);
        this.close();
    }

    // ── Favorites ───────────────────────────────────────────────────────

    isFavorite(app) {
        return this.state.favoriteAppIds.includes(app.id);
    }

    toggleFavorite(app, ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const ids = [...this.state.favoriteAppIds];
        const idx = ids.indexOf(app.id);
        if (idx >= 0) {
            ids.splice(idx, 1);
        } else {
            ids.push(app.id);
        }
        setFavoriteAppIds(ids);
        this.state.favoriteAppIds = ids;
        this.env.bus.trigger("NOVA:FAVORITES-CHANGED");
    }
}

NovaAppLauncher.template = "nova_theme.AppLauncher";
NovaAppLauncher.props = {};

registry.category("main_components").add("NovaAppLauncher", {
    Component: NovaAppLauncher,
});

// Patch NavBar to add the apps button click handler
patch(NavBar.prototype, "nova_theme.NavBar", {
    onNovaAppsClick() {
        this.env.bus.trigger("NOVA:TOGGLE-LAUNCHER");
    },
});
