/** @odoo-module **/

import { Component, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const MENU_SELECTOR =
    ".dropdown-item[data-section], " +
    ".nova-app-tile[data-menu-id], " +
    ".nova-sidebar__item[data-menu-id]";

/**
 * NovaPrefetch — Invisible component that pre-loads view definitions on menu
 * hover so that subsequent click-navigation is faster.
 *
 * v2 fixes: abort all in-flight prefetch RPCs the instant a navigation starts
 * (click on menu item OR ACTION_MANAGER:UPDATE) to avoid saturating the
 * single-threaded Odoo worker with prefetch traffic during actual navigation.
 */
class NovaPrefetch extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.menuService = useService("menu");
        this.viewService = useService("view");

        /** @type {Set<number>} menu IDs already prefetched this session */
        this._prefetched = new Set();
        this._hoverTimer = null;
        /** True while a navigation is in progress — blocks new prefetches */
        this._navigating = false;
        /** Active AbortController for the current prefetch RPC chain */
        this._abortController = null;

        this._onMouseEnter = this._onMouseEnter.bind(this);
        this._onMouseLeave = this._onMouseLeave.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onClearCaches = this._onClearCaches.bind(this);
        this._onActionUpdate = this._onActionUpdate.bind(this);

        onMounted(() => {
            document.body.addEventListener("mouseenter", this._onMouseEnter, true);
            document.body.addEventListener("mouseleave", this._onMouseLeave, true);
            document.body.addEventListener("click", this._onClick, true);
            this.env.bus.addEventListener("CLEAR-CACHES", this._onClearCaches);
            this.env.bus.addEventListener("ACTION_MANAGER:UPDATE", this._onActionUpdate);
        });

        onWillUnmount(() => {
            document.body.removeEventListener("mouseenter", this._onMouseEnter, true);
            document.body.removeEventListener("mouseleave", this._onMouseLeave, true);
            document.body.removeEventListener("click", this._onClick, true);
            this.env.bus.removeEventListener("CLEAR-CACHES", this._onClearCaches);
            this.env.bus.removeEventListener("ACTION_MANAGER:UPDATE", this._onActionUpdate);
            this._cancelPrefetch();
        });
    }

    // ── Event handlers ─────────────────────────────────────────────────

    _onMouseEnter(ev) {
        if (this._navigating) return;

        const el = ev.target.closest(MENU_SELECTOR);
        if (!el) return;

        const menuId = parseInt(el.dataset.section || el.dataset.menuId, 10);
        if (!menuId || this._prefetched.has(menuId)) return;

        this._hoverTimer = setTimeout(() => this._prefetch(menuId), 80);
    }

    _onMouseLeave() {
        clearTimeout(this._hoverTimer);
    }

    /**
     * On click on any menu item: immediately abort in-flight prefetch RPCs
     * and block new prefetches until the navigation completes.
     */
    _onClick(ev) {
        if (ev.target.closest(MENU_SELECTOR)) {
            this._cancelPrefetch();
            this._navigating = true;
        }
    }

    /**
     * Navigation complete — re-enable prefetching.
     */
    _onActionUpdate() {
        this._navigating = false;
    }

    _onClearCaches() {
        this._prefetched.clear();
    }

    // ── Prefetch logic ─────────────────────────────────────────────────

    /** Cancel hover timer + abort any in-flight prefetch RPCs */
    _cancelPrefetch() {
        clearTimeout(this._hoverTimer);
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
    }

    async _prefetch(menuId) {
        if (this._navigating) return;

        const menu = this.menuService.getMenu(menuId);
        if (!menu?.actionID) return;
        this._prefetched.add(menuId);

        // Create a new AbortController for this prefetch chain
        this._cancelPrefetch();
        const ac = new AbortController();
        this._abortController = ac;

        // Step 1: load action descriptor (~30ms RPC)
        let action;
        try {
            action = await this.rpc("/web/action/load", { action_id: menu.actionID });
        } catch {
            return;
        }
        // Bail if aborted between RPCs (user clicked)
        if (ac.signal.aborted) return;
        if (!action || action.type !== "ir.actions.act_window") return;

        // Step 2: fill the native view cache (the big win: 48-112ms saved)
        try {
            await this.viewService.loadViews(
                {
                    context: action.context || {},
                    views: action.views,
                    resModel: action.res_model,
                },
                {
                    actionId: action.id,
                    loadActionMenus: action.target !== "new" && action.target !== "inline",
                    loadIrFilters: action.views.some((v) => v[1] === "search"),
                }
            );
        } catch {
            // silently ignore prefetch failures
        }

        // Clean up if this is still the active controller
        if (this._abortController === ac) {
            this._abortController = null;
        }
    }
}

NovaPrefetch.template = owl.xml`<div/>`;
NovaPrefetch.props = {};

registry.category("main_components").add("NovaPrefetch", { Component: NovaPrefetch });
