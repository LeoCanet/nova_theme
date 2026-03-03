/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { session } from "@web/session";

export class NovaMobileMenu extends Component {
    setup() {
        this.menuService = useService("menu");
        this.actionService = useService("action");
        this.user = useService("user");

        this.state = useState({
            isOpen: false,
            isUserMenuOpen: false,
        });

        // Touch tracking for swipe-to-close
        this._touchStartX = 0;
        this._touchCurrentX = 0;

        // Bus event handlers for auto-close
        this._boundOnActionUpdate = () => this._closeMenu();
        this._boundOnHomeMenu = () => this._closeMenu();

        onMounted(() => {
            this.env.bus.addEventListener("ACTION_MANAGER:UPDATE", this._boundOnActionUpdate);
            this.env.bus.addEventListener("HOME-MENU:TOGGLED", this._boundOnHomeMenu);
        });

        onWillUnmount(() => {
            this.env.bus.removeEventListener("ACTION_MANAGER:UPDATE", this._boundOnActionUpdate);
            this.env.bus.removeEventListener("HOME-MENU:TOGGLED", this._boundOnHomeMenu);
            this._unlockScroll();
        });
    }

    // ── Computed ──────────────────────────────────────────────────────────

    get userName() {
        return session.name || "";
    }

    get userAvatarUrl() {
        return `/web/image?model=res.users&id=${session.uid}&field=avatar_128`;
    }

    get currentApp() {
        try {
            return this.menuService.getCurrentApp();
        } catch {
            return null;
        }
    }

    get currentAppSections() {
        const app = this.currentApp;
        if (!app) return [];
        try {
            const tree = this.menuService.getMenuAsTree(app.id);
            return tree.childrenTree || [];
        } catch {
            return [];
        }
    }

    // ── Menu open/close ──────────────────────────────────────────────────

    _openMenu() {
        this.state.isOpen = true;
        this.state.isUserMenuOpen = false;
        this._lockScroll();
    }

    _closeMenu() {
        if (!this.state.isOpen) return;
        this.state.isOpen = false;
        this._unlockScroll();
    }

    _lockScroll() {
        document.body.style.overflow = "hidden";
    }

    _unlockScroll() {
        document.body.style.overflow = "";
    }

    // ── Menu item click ──────────────────────────────────────────────────

    _onMenuClicked(menu) {
        this.menuService.selectMenu(menu);
        this._closeMenu();
    }

    // ── User menu ────────────────────────────────────────────────────────

    _toggleUserMenu() {
        this.state.isUserMenuOpen = !this.state.isUserMenuOpen;
    }

    _onPreferences() {
        this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: "res.users",
            res_id: session.uid,
            views: [[false, "form"]],
            target: "current",
        });
        this._closeMenu();
    }

    // ── Swipe to close (right swipe) ─────────────────────────────────────

    _onTouchStart(ev) {
        this._touchStartX = ev.touches[0].clientX;
        this._touchCurrentX = this._touchStartX;
    }

    _onTouchMove(ev) {
        this._touchCurrentX = ev.touches[0].clientX;
    }

    _onTouchEnd() {
        const deltaX = this._touchCurrentX - this._touchStartX;
        if (deltaX > 100) {
            this._closeMenu();
        }
    }
}

NovaMobileMenu.template = "nova_theme.MobileMenu";
NovaMobileMenu.props = {};

// Register our mobile menu under a Nova-specific key
const systray = registry.category("systray");
systray.add("nova_theme.MobileMenu", { Component: NovaMobileMenu }, { sequence: 0 });

// Remove Odoo's native burger_menu whenever it appears.
// OWL EventBus extends EventTarget — trigger() dispatches a CustomEvent.
if (systray.contains("burger_menu")) {
    systray.remove("burger_menu");
}
systray.addEventListener("UPDATE", (ev) => {
    const { operation, key } = ev.detail || {};
    if (operation === "add" && key === "burger_menu") {
        // Defer removal to avoid mutating registry during its own dispatch cycle
        Promise.resolve().then(() => {
            if (systray.contains("burger_menu")) {
                systray.remove("burger_menu");
            }
        });
    }
});
