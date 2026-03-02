/** @odoo-module **/

import { Component, onMounted, onWillUnmount } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const MENU_SELECTOR =
    ".dropdown-item[data-section], " +
    ".nova-app-tile[data-menu-id], " +
    ".nova-sidebar__item[data-menu-id]";

/** Max number of menus to prefetch per session (avoids flooding on idle hover) */
const MAX_PREFETCH = 10;

/**
 * NovaPrefetch — Invisible component that pre-loads view definitions on menu
 * hover so that subsequent click-navigation is faster.
 *
 * Uses mouseover (bubbles reliably) instead of mouseenter (non-bubbling,
 * unreliable for event delegation via capture).
 */
class NovaPrefetch extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.menuService = useService("menu");
        this.viewService = useService("view");

        /** @type {Set<number>} menu IDs already prefetched this session */
        this._prefetched = new Set();
        this._hoverTimer = null;
        /** Currently hovered menu element (dedup for mouseover) */
        this._hoverEl = null;
        /** True while a navigation is in progress — blocks new prefetches */
        this._navigating = false;
        /** True while a prefetch RPC chain is in-flight (1 at a time max) */
        this._inFlight = false;

        this._onPointerOver = this._onPointerOver.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onClearCaches = this._onClearCaches.bind(this);
        this._onActionUpdate = this._onActionUpdate.bind(this);

        onMounted(() => {
            document.body.addEventListener("mouseover", this._onPointerOver);
            document.body.addEventListener("click", this._onClick, true);
            this.env.bus.addEventListener("CLEAR-CACHES", this._onClearCaches);
            this.env.bus.addEventListener("ACTION_MANAGER:UPDATE", this._onActionUpdate);
        });

        onWillUnmount(() => {
            document.body.removeEventListener("mouseover", this._onPointerOver);
            document.body.removeEventListener("click", this._onClick, true);
            this.env.bus.removeEventListener("CLEAR-CACHES", this._onClearCaches);
            this.env.bus.removeEventListener("ACTION_MANAGER:UPDATE", this._onActionUpdate);
            this._cancelPrefetch();
        });
    }

    // ── Event handlers ─────────────────────────────────────────────────

    /**
     * mouseover bubbles reliably — works for event delegation.
     * We track _hoverEl to avoid restarting the timer on child-to-child
     * movements within the same menu element.
     */
    _onPointerOver(ev) {
        const el = ev.target.closest(MENU_SELECTOR);

        // Same element as before — nothing to do
        if (el === this._hoverEl) return;

        // Changed element — always clear previous timer
        clearTimeout(this._hoverTimer);
        this._hoverEl = el;

        // Left menu area or navigating — done
        if (!el || this._navigating) return;

        const menuId = parseInt(el.dataset.section || el.dataset.menuId, 10);
        if (!menuId || this._prefetched.has(menuId) || this._inFlight) return;

        this._hoverTimer = setTimeout(() => this._prefetch(menuId), 80);
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

    /** Navigation complete — re-enable prefetching. */
    _onActionUpdate() {
        this._navigating = false;
    }

    _onClearCaches() {
        this._prefetched.clear();
    }

    // ── Prefetch logic ─────────────────────────────────────────────────

    /** Cancel hover timer */
    _cancelPrefetch() {
        clearTimeout(this._hoverTimer);
        this._hoverEl = null;
    }

    async _prefetch(menuId) {
        if (this._navigating || this._inFlight) return;
        if (this._prefetched.size >= MAX_PREFETCH) return;

        const menu = this.menuService.getMenu(menuId);
        if (!menu?.actionID) return;
        this._prefetched.add(menuId);
        this._inFlight = true;

        try {
            // Step 1: load action descriptor (~30ms RPC)
            const action = await this.rpc("/web/action/load", { action_id: menu.actionID });
            if (this._navigating) return;
            if (!action || action.type !== "ir.actions.act_window") return;

            // Step 2: fill the native view cache (the big win: 48-112ms saved)
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
        } finally {
            this._inFlight = false;
        }
    }
}

NovaPrefetch.template = owl.xml`<div/>`;
NovaPrefetch.props = {};

registry.category("main_components").add("NovaPrefetch", { Component: NovaPrefetch });
