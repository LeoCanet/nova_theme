/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";

export class NovaSidebar extends Component {
    setup() {
        this.menuService = useService("menu");
        this.actionService = useService("action");
        this.router = useService("router");

        const sidebarCollapsed =
            document.documentElement.dataset.novaSidebarCollapsed === "True";

        this.state = useState({
            collapsed: sidebarCollapsed,
            currentAppId: null,
            menuItems: [],
            // Counter bumped on every navigation to force re-render (updates isActive)
            _tick: 0,
        });

        this._boundOnUpdate = () => this._updateMenuItems();
        // hashchange catches ALL navigation — including app switches via
        // the launcher, navbar clicks, breadcrumb, and browser back/forward
        this._boundOnHashChange = () => {
            // Small delay: the menu service needs a tick to update getCurrentApp()
            setTimeout(() => this._updateMenuItems(), 50);
        };

        onMounted(() => {
            this._updateBodyClasses();
            this._updateMenuItems();
            this.env.bus.addEventListener(
                "ACTION_MANAGER:UI-UPDATED",
                this._boundOnUpdate
            );
            window.addEventListener("hashchange", this._boundOnHashChange);
        });

        onWillUnmount(() => {
            document.body.classList.remove(
                "nova-sidebar-open",
                "nova-sidebar-collapsed"
            );
            this.env.bus.removeEventListener(
                "ACTION_MANAGER:UI-UPDATED",
                this._boundOnUpdate
            );
            window.removeEventListener("hashchange", this._boundOnHashChange);
        });
    }

    _updateMenuItems() {
        try {
            const currentApp = this.menuService.getCurrentApp();
            if (currentApp) {
                const menuTree = this.menuService.getMenuAsTree(currentApp.id);
                const newItems =
                    menuTree && menuTree.childrenTree
                        ? menuTree.childrenTree
                        : [];
                // Always update — menu tree is cheap and this ensures
                // the sidebar reflects the current app immediately
                this.state.menuItems = newItems;
                this.state.currentAppId = currentApp.id;
                document.body.classList.add("nova-sidebar-open");
                document.body.classList.remove("nova-home-menu-visible");
            } else {
                this.state.menuItems = [];
                this.state.currentAppId = null;
                document.body.classList.remove("nova-sidebar-open");
                document.body.classList.add("nova-home-menu-visible");
            }
        } catch (e) {
            this.state.menuItems = [];
        }
        // Bump tick to force re-render so isActive() is re-evaluated
        this.state._tick++;
        this._updateBodyClasses();
    }

    _updateBodyClasses() {
        document.body.classList.toggle(
            "nova-sidebar-collapsed",
            this.state.collapsed
        );
    }

    get menuItems() {
        return this.state.menuItems;
    }

    toggleCollapse() {
        this.state.collapsed = !this.state.collapsed;
        this._updateBodyClasses();
    }

    /**
     * Determines if a menu item is currently active by comparing its action ID
     * with the current router action. Handles both Odoo 16 router formats:
     *   - router.current.hash.action  (standard)
     *   - router.current.action       (alternative)
     */
    isActive(item) {
        if (!item.actionID) return false;
        try {
            const current = this.router.current;
            const actionId =
                (current.hash && current.hash.action) || current.action;
            if (actionId) {
                return Number(item.actionID) === Number(actionId);
            }
        } catch (e) {
            // ignore — router might not be ready yet
        }
        return false;
    }

    onMenuClick(item) {
        if (item.actionID) {
            this.menuService.selectMenu(item);
        }
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
