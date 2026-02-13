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
        const fontSize = htmlEl.dataset.novaFontSize || "default";
        const fontFamily = htmlEl.dataset.novaFontFamily || "inter";

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

        // Apply font size preset
        if (fontSize && fontSize !== "default") {
            htmlEl.dataset.novaFontSize = fontSize;
        }

        // Apply font family + load Google Font if needed
        if (fontFamily && fontFamily !== "inter") {
            htmlEl.dataset.novaFontFamily = fontFamily;
            this._loadGoogleFont(fontFamily);
        }
    },

    /**
     * Dynamically loads a Google Font by injecting a <link> element.
     * Inter is bundled locally — only non-Inter fonts need loading.
     */
    _loadGoogleFont(fontKey) {
        const fontMap = {
            roboto: "Roboto:wght@400;500;600;700",
            poppins: "Poppins:wght@400;500;600;700",
            lato: "Lato:wght@400;700;900",
            montserrat: "Montserrat:wght@400;500;600;700",
            "open-sans": "Open+Sans:wght@400;500;600;700",
            "ibm-plex": "IBM+Plex+Sans:wght@400;500;600;700",
        };

        const fontParam = fontMap[fontKey];
        if (!fontParam) return;

        // Avoid duplicate injection
        const linkId = "nova-google-font";
        if (document.getElementById(linkId)) return;

        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(link);
    },
});
