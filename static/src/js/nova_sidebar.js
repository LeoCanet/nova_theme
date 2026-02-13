/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { getFavoriteAppIds, getPinnedPages, setPinnedPages } from "./nova_storage";

export class NovaSidebar extends Component {
    setup() {
        this.menuService = useService("menu");
        this.actionService = useService("action");
        this.router = useService("router");

        const sidebarCollapsed =
            document.documentElement.dataset.novaSidebarCollapsed === "True";

        this.state = useState({
            collapsed: sidebarCollapsed,
            favoriteApps: [],
            pinnedPages: [],
            _tick: 0,
        });

        this._boundOnAppChanged = () => {
            this._loadFavorites();
            this._updateVisibility();
            this.state._tick++;
        };

        this._boundOnUiUpdated = () => {
            this.state._tick++;
        };

        this._boundOnFavoritesChanged = () => this._loadFavorites();
        this._boundOnPinsChanged = () => this._loadPins();

        onMounted(() => {
            this._loadFavorites();
            this._loadPins();
            this._updateVisibility();
            this.env.bus.addEventListener("MENUS:APP-CHANGED", this._boundOnAppChanged);
            this.env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", this._boundOnUiUpdated);
            this.env.bus.addEventListener("NOVA:FAVORITES-CHANGED", this._boundOnFavoritesChanged);
            this.env.bus.addEventListener("NOVA:PINS-CHANGED", this._boundOnPinsChanged);
        });

        onWillUnmount(() => {
            document.body.classList.remove("nova-sidebar-open", "nova-sidebar-collapsed");
            this.env.bus.removeEventListener("MENUS:APP-CHANGED", this._boundOnAppChanged);
            this.env.bus.removeEventListener("ACTION_MANAGER:UI-UPDATED", this._boundOnUiUpdated);
            this.env.bus.removeEventListener("NOVA:FAVORITES-CHANGED", this._boundOnFavoritesChanged);
            this.env.bus.removeEventListener("NOVA:PINS-CHANGED", this._boundOnPinsChanged);
        });
    }

    // ── Data loading ────────────────────────────────────────────────────

    _loadFavorites() {
        const ids = getFavoriteAppIds();
        const allApps = this.menuService.getApps();
        const appMap = Object.fromEntries(allApps.map((a) => [a.id, a]));
        this.state.favoriteApps = ids.map((id) => appMap[id]).filter(Boolean);
        this._updateVisibility();
    }

    _loadPins() {
        // Migrate legacy pins that lack a key
        const pages = getPinnedPages().map((p) => {
            if (!p.key) {
                p.key = this._pinKey(p);
            }
            return p;
        });
        this.state.pinnedPages = pages;
        this._updateVisibility();
    }

    // ── Visibility ──────────────────────────────────────────────────────

    _updateVisibility() {
        const currentApp = this.menuService.getCurrentApp();
        const hasContent =
            this.state.favoriteApps.length > 0 || this.state.pinnedPages.length > 0;

        if (currentApp && hasContent) {
            document.body.classList.add("nova-sidebar-open");
            document.body.classList.remove("nova-home-menu-visible");
        } else if (!currentApp) {
            document.body.classList.remove("nova-sidebar-open");
            document.body.classList.add("nova-home-menu-visible");
        } else {
            document.body.classList.remove("nova-sidebar-open");
            document.body.classList.remove("nova-home-menu-visible");
        }

        this._updateBodyClasses();
    }

    _updateBodyClasses() {
        document.body.classList.toggle("nova-sidebar-collapsed", this.state.collapsed);
    }

    // ── Favorites ───────────────────────────────────────────────────────

    onFavoriteClick(app) {
        this.menuService.selectMenu(app);
    }

    isFavoriteActive(app) {
        void this.state._tick;
        try {
            const currentApp = this.menuService.getCurrentApp();
            return currentApp && currentApp.id === app.id;
        } catch {
            return false;
        }
    }

    getAppIconSrc(app) {
        return `/web/image?model=ir.ui.menu&id=${app.id}&field=web_icon_data`;
    }

    // ── Page info helpers ────────────────────────────────────────────────
    //
    // A "page" is identified by (actionId, viewType, resId).
    //   - Contacts list  → { actionId: 123, viewType: "list",  resId: null }
    //   - Contact form   → { actionId: 123, viewType: "form",  resId: 42   }
    // These are different pages even though they share the same action.

    /**
     * Build a unique key string for a pin or page info object.
     * Handles both new pins (actionId) and legacy pins (actionID).
     */
    _pinKey(p) {
        const aid = p.actionId ?? p.actionID ?? "";
        const vt = p.viewType ?? "";
        const rid = p.resId ?? "";
        return `${aid}:${vt}:${rid}`;
    }

    /**
     * Snapshot of the page currently displayed. Uses actionService.currentController
     * as primary source (synchronous, always up-to-date) with router hash as fallback.
     * Returns null when no action is loaded (e.g. home screen).
     */
    _currentPage() {
        // Primary: action service — updated synchronously BEFORE
        // ACTION_MANAGER:UI-UPDATED fires (unlike the debounced router hash).
        try {
            const ct = this.actionService.currentController;
            if (ct && ct.action) {
                const action = ct.action;
                const props = ct.props || {};
                const actionId =
                    action.id || (action.type === "ir.actions.client" ? action.tag : null);
                if (actionId != null) {
                    return {
                        actionId,
                        viewType: props.type || null,
                        model: props.resModel || null,
                        resId: props.resId || (props.state && props.state.resId) || null,
                        displayName: ct.displayName || null,
                    };
                }
            }
        } catch { /* controller not ready */ }

        // Fallback: router hash (may lag one tick behind after navigation)
        try {
            const h = this.router.current.hash;
            if (h && h.action != null) {
                return {
                    actionId: h.action,
                    viewType: h.view_type || null,
                    model: h.model || null,
                    resId: h.id || null,
                    displayName: null,
                };
            }
        } catch { /* ignore */ }

        return null;
    }

    // ── Pinned pages ────────────────────────────────────────────────────

    get canPinCurrentPage() {
        void this.state._tick;
        return !!this.menuService.getCurrentApp() && this._currentPage() != null;
    }

    get isPageAlreadyPinned() {
        void this.state._tick;
        const page = this._currentPage();
        if (!page) return false;
        const key = this._pinKey(page);
        return this.state.pinnedPages.some((p) => (p.key || this._pinKey(p)) === key);
    }

    pinCurrentPage() {
        const currentApp = this.menuService.getCurrentApp();
        if (!currentApp) return;

        const page = this._currentPage();
        if (!page) return;

        const key = this._pinKey(page);

        // Deduplicate
        if (this.state.pinnedPages.some((p) => (p.key || this._pinKey(p)) === key)) return;

        // Try to find a menu-item name for the action
        let menuName = null;
        try {
            const tree = this.menuService.getMenuAsTree(currentApp.id);
            const mi = this._findMenuByAction(tree, page.actionId);
            if (mi) menuName = mi.name;
        } catch { /* ignore */ }

        // Pick the best display name:
        //   form view  → controller display name (record name)
        //   list/other → menu item name > controller name > document title
        let name;
        if (page.resId && page.displayName) {
            name = page.displayName;
        } else {
            name =
                menuName ||
                page.displayName ||
                (document.title || "").replace(/\s*[-–—|].*$/, "").trim() ||
                `Page ${page.actionId}`;
        }

        const pin = {
            key,
            actionID: page.actionId,
            viewType: page.viewType,
            model: page.model,
            resId: page.resId,
            name,
            appId: currentApp.id,
            appName: currentApp.name,
        };

        const pages = [...this.state.pinnedPages, pin];
        setPinnedPages(pages);
        this.state.pinnedPages = pages;
        this._updateVisibility();
        this.env.bus.trigger("NOVA:PINS-CHANGED");
    }

    removePin(pin) {
        const target = pin.key || this._pinKey(pin);
        const pages = this.state.pinnedPages.filter(
            (p) => (p.key || this._pinKey(p)) !== target
        );
        setPinnedPages(pages);
        this.state.pinnedPages = pages;
        this._updateVisibility();
        this.env.bus.trigger("NOVA:PINS-CHANGED");
    }

    isPinActive(pin) {
        void this.state._tick;
        const page = this._currentPage();
        if (!page) return false;
        return (pin.key || this._pinKey(pin)) === this._pinKey(page);
    }

    /**
     * Navigate to a pinned page.
     * Uses doAction with viewType + resId so Odoo opens exactly the right
     * view instead of always falling back to the default list.
     */
    onPinClick(pin) {
        if (!pin.actionID) return;

        if (pin.resId && pin.model) {
            // Specific record → inline action descriptor
            this.actionService.doAction({
                type: "ir.actions.act_window",
                res_model: pin.model,
                res_id: pin.resId,
                views: [[false, "form"]],
                target: "current",
            });
        } else {
            // List / kanban / other multi-record views
            const options = {};
            if (pin.viewType) {
                options.viewType = pin.viewType;
            }
            this.actionService.doAction(pin.actionID, options);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    _findMenuByAction(node, actionId) {
        if (!node) return null;
        if (node.actionID != null && String(node.actionID) === String(actionId)) return node;
        const children = node.childrenTree || [];
        for (const child of children) {
            const found = this._findMenuByAction(child, actionId);
            if (found) return found;
        }
        return null;
    }

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        this._updateBodyClasses();
    }

    getMenuIcon(item) {
        const iconMap = {
            contacts: "fa-address-book",
            customers: "fa-users",
            products: "fa-cube",
            product: "fa-cube",
            orders: "fa-shopping-cart",
            order: "fa-shopping-cart",
            invoices: "fa-file-text-o",
            invoice: "fa-file-text-o",
            pipeline: "fa-filter",
            leads: "fa-phone",
            lead: "fa-phone",
            opportunities: "fa-star",
            quotations: "fa-file-o",
            quotation: "fa-file-o",
            "sales orders": "fa-shopping-bag",
            commandes: "fa-shopping-bag",
            teams: "fa-group",
            activities: "fa-clock-o",
            reports: "fa-bar-chart",
            reporting: "fa-bar-chart",
            analyse: "fa-bar-chart",
            configuration: "fa-cog",
            settings: "fa-cog",
            "paramètres": "fa-cog",
            employees: "fa-id-badge",
            "employés": "fa-id-badge",
            calendar: "fa-calendar",
            calendrier: "fa-calendar",
            dashboard: "fa-tachometer",
            "tableau de bord": "fa-tachometer",
            kanban: "fa-th-large",
            projects: "fa-folder",
            projets: "fa-folder",
            tasks: "fa-tasks",
            "tâches": "fa-tasks",
            timesheets: "fa-clock-o",
            "feuilles de temps": "fa-clock-o",
            inventory: "fa-cubes",
            inventaire: "fa-cubes",
            operations: "fa-exchange",
            "opérations": "fa-exchange",
            manufacturing: "fa-industry",
            fabrication: "fa-industry",
            purchases: "fa-shopping-basket",
            achats: "fa-shopping-basket",
            vendors: "fa-truck",
            fournisseurs: "fa-truck",
            payments: "fa-credit-card",
            paiements: "fa-credit-card",
            journals: "fa-book",
            journaux: "fa-book",
            clients: "fa-users",
            articles: "fa-cube",
            factures: "fa-file-text-o",
            devis: "fa-file-o",
            "réparations": "fa-wrench",
            repairs: "fa-wrench",
            tickets: "fa-ticket",
            planning: "fa-calendar-check-o",
            notes: "fa-sticky-note",
            discuss: "fa-comments",
            mail: "fa-envelope",
            accounting: "fa-university",
            "comptabilité": "fa-university",
        };
        const name = (item.name || "").toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
            if (name.includes(key)) return icon;
        }
        return "fa-circle-o";
    }
}

NovaSidebar.template = "nova_theme.Sidebar";
NovaSidebar.props = {};

registry.category("main_components").add("NovaSidebar", {
    Component: NovaSidebar,
});
