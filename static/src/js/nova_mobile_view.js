/** @odoo-module **/

import { registry } from "@web/core/registry";

// On mobile, prefer list view over kanban as default multi-record view.
// Odoo uses isMobileFriendly to auto-switch views on small screens.
// Native kanban has isMobileFriendly=true, list has none (undefined/falsy).
// We flip them so the action_service picks list first on mobile.

const viewRegistry = registry.category("views");

let patched = false;

function patchMobileViews() {
    if (patched) return;

    try {
        const kanban = viewRegistry.get("kanban");
        const list = viewRegistry.get("list");
        if (kanban && list) {
            kanban.isMobileFriendly = false;
            list.isMobileFriendly = true;
            patched = true;
        }
    } catch (e) {
        // views not registered yet
    }
}

viewRegistry.addEventListener("UPDATE", patchMobileViews);
patchMobileViews();
