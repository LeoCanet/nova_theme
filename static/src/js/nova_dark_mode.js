/** @odoo-module **/

import { Component, useState, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";

export class NovaDarkModeToggle extends Component {
    setup() {
        this.orm = useService("orm");

        const htmlEl = document.documentElement;
        const currentMode = htmlEl.dataset.novaMode || "light";
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = currentMode === "dark" || (currentMode === "auto" && prefersDark);

        this.state = useState({ isDark });

        // Ensure class is applied on setup
        this._applyMode(isDark);

        // Listen for system preference changes (for "auto" mode)
        this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this._onSystemChange = (e) => {
            if (document.documentElement.dataset.novaMode === "auto") {
                this.state.isDark = e.matches;
                this._applyMode(e.matches);
            }
        };
        this._mediaQuery.addEventListener("change", this._onSystemChange);

        onWillUnmount(() => {
            if (this._mediaQuery && this._onSystemChange) {
                this._mediaQuery.removeEventListener("change", this._onSystemChange);
            }
        });
    }

    _applyMode(isDark) {
        const htmlEl = document.documentElement;
        if (isDark) {
            htmlEl.classList.add("nova-dark");
        } else {
            htmlEl.classList.remove("nova-dark");
        }
    }

    async onToggle() {
        this.state.isDark = !this.state.isDark;
        this._applyMode(this.state.isDark);

        // Persist the setting
        const newMode = this.state.isDark ? "dark" : "light";
        document.documentElement.dataset.novaMode = newMode;

        try {
            await this.orm.call(
                "ir.config_parameter",
                "set_param",
                ["nova_theme.mode", newMode]
            );
        } catch (e) {
            // Silently fail — the toggle still works locally
            console.warn("Theme Nova: could not persist dark mode preference", e);
        }
    }
}

NovaDarkModeToggle.template = "nova_theme.DarkModeToggle";
NovaDarkModeToggle.props = {};

registry.category("systray").add("nova_theme.DarkModeToggle", {
    Component: NovaDarkModeToggle,
}, { sequence: 1 });
