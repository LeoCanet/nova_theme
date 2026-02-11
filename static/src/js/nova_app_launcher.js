/** @odoo-module **/

import { Component, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";

export class NovaAppLauncher extends Component {
    setup() {
        this.menuService = useService("menu");
        this.hotkeyService = useService("hotkey");
        this.searchInput = useRef("novaSearchInput");
        this.state = useState({
            isOpen: false,
            searchQuery: "",
        });

        this._boundToggle = this._onToggle.bind(this);
        this._removeHotkey = this.hotkeyService.add("h", () => this._onToggle());

        onMounted(() => {
            this.env.bus.addEventListener("NOVA:TOGGLE-LAUNCHER", this._boundToggle);
        });

        onWillUnmount(() => {
            this.env.bus.removeEventListener("NOVA:TOGGLE-LAUNCHER", this._boundToggle);
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
        // Use Odoo's web/image endpoint — handles MIME type + missing icons automatically
        return `/web/image?model=ir.ui.menu&id=${app.id}&field=web_icon_data`;
    }

    get filteredApps() {
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
