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

        // MENUS:APP-CHANGED fires AFTER setCurrentMenu() sets currentAppId,
        // so getCurrentApp() is guaranteed correct. This is the right event
        // for visibility — unlike ACTION_MANAGER:UI-UPDATED which fires
        // before setCurrentMenu() during the boot sequence.
        this._boundOnAppChanged = () => {
            this._loadFavorites();
            this._updateVisibility();
            this.state._tick++;
        };

        // ACTION_MANAGER:UI-UPDATED fires on every action change (sub-page
        // navigation within an app). We only bump _tick to re-evaluate
        // active states — no visibility update needed here.
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
        // Resolve IDs to app objects, skip obsolete ones
        this.state.favoriteApps = ids.map((id) => appMap[id]).filter(Boolean);
        this._updateVisibility();
    }

    _loadPins() {
        this.state.pinnedPages = getPinnedPages();
        this._updateVisibility();
    }

    // ── Visibility ──────────────────────────────────────────────────────

    _updateVisibility() {
        const currentApp = this.menuService.getCurrentApp();
        const hasFavs = this.state.favoriteApps.length > 0;
        const hasPins = this.state.pinnedPages.length > 0;
        const hasContent = hasFavs || hasPins;

        if (currentApp && hasContent) {
            document.body.classList.add("nova-sidebar-open");
            document.body.classList.remove("nova-home-menu-visible");
        } else if (!currentApp) {
            // Home menu — always hide sidebar
            document.body.classList.remove("nova-sidebar-open");
            document.body.classList.add("nova-home-menu-visible");
        } else {
            // In an app but no content — hide sidebar
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
        // Read _tick to force re-evaluation
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

    // ── Pinned pages ────────────────────────────────────────────────────

    get canPinCurrentPage() {
        return !!this.menuService.getCurrentApp();
    }

    get isPageAlreadyPinned() {
        // Read _tick to force re-evaluation
        void this.state._tick;
        try {
            const current = this.router.current;
            const actionId = (current.hash && current.hash.action) || current.action;
            if (!actionId) return false;
            return this.state.pinnedPages.some((p) => Number(p.actionID) === Number(actionId));
        } catch {
            return false;
        }
    }

    pinCurrentPage() {
        try {
            const currentApp = this.menuService.getCurrentApp();
            if (!currentApp) return;

            const current = this.router.current;
            const actionId = (current.hash && current.hash.action) || current.action;
            if (!actionId) return;

            // Deduplicate
            if (this.state.pinnedPages.some((p) => Number(p.actionID) === Number(actionId))) return;

            // Find the menu item by searching the menu tree recursively
            const menuTree = this.menuService.getMenuAsTree(currentApp.id);
            const menuItem = this._findMenuByAction(menuTree, Number(actionId));

            if (!menuItem) return;

            const pin = {
                menuId: menuItem.id,
                actionID: menuItem.actionID,
                name: menuItem.name,
                appId: currentApp.id,
                appName: currentApp.name,
            };

            const pages = [...this.state.pinnedPages, pin];
            setPinnedPages(pages);
            this.state.pinnedPages = pages;
            this._updateVisibility();
            this.env.bus.trigger("NOVA:PINS-CHANGED");
        } catch {
            // ignore — menu might not be ready
        }
    }

    _findMenuByAction(node, actionId) {
        if (!node) return null;
        if (Number(node.actionID) === actionId) return node;
        const children = node.childrenTree || [];
        for (const child of children) {
            const found = this._findMenuByAction(child, actionId);
            if (found) return found;
        }
        return null;
    }

    removePin(pin) {
        const pages = this.state.pinnedPages.filter((p) => p.menuId !== pin.menuId);
        setPinnedPages(pages);
        this.state.pinnedPages = pages;
        this._updateVisibility();
        this.env.bus.trigger("NOVA:PINS-CHANGED");
    }

    isPinActive(pin) {
        // Read _tick to force re-evaluation
        void this.state._tick;
        try {
            const current = this.router.current;
            const actionId = (current.hash && current.hash.action) || current.action;
            return actionId && Number(pin.actionID) === Number(actionId);
        } catch {
            return false;
        }
    }

    onPinClick(pin) {
        if (pin.actionID) {
            this.actionService.doAction(pin.actionID);
        }
    }

    // ── Collapse ────────────────────────────────────────────────────────

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        this._updateBodyClasses();
    }

    // ── Menu icon mapping ───────────────────────────────────────────────

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
