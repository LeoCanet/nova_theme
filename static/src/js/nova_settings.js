/** @odoo-module **/

/**
 * Theme Nova — Settings Integration
 * Handles reading/applying theme preferences on webclient load.
 */

import { WebClient } from "@web/webclient/webclient";
import { patch } from "@web/core/utils/patch";

patch(WebClient.prototype, "nova_theme.WebClient", {
    setup() {
        this._super(...arguments);
        this._applyNovaSettings();
    },

    _applyNovaSettings() {
        const htmlEl = document.documentElement;

        // Read settings from data attributes (injected by webclient_templates.xml)
        const mode = htmlEl.dataset.novaMode || "light";
        const accent = htmlEl.dataset.novaAccent || "indigo";
        const animations = htmlEl.dataset.novaAnimations;
        const sidebarCollapsed = htmlEl.dataset.novaSidebarCollapsed;

        // Apply dark mode
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (mode === "dark" || (mode === "auto" && prefersDark)) {
            htmlEl.classList.add("nova-dark");
        } else {
            htmlEl.classList.remove("nova-dark");
        }

        // Apply accent color
        htmlEl.dataset.novaAccent = accent;

        // Apply animations preference
        if (animations === "False") {
            htmlEl.dataset.novaAnimations = "False";
        }

        // Apply sidebar default
        if (sidebarCollapsed === "True") {
            document.body.classList.add("nova-sidebar-collapsed");
        }
    },
});
