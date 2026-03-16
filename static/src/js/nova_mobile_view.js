/** @odoo-module **/

import { registry } from "@web/core/registry";

// On mobile, prefer list view over kanban as default multi-record view.
// Odoo uses isMobileFriendly to auto-switch views on small screens.
// Native kanban has isMobileFriendly=true, list has none (undefined/falsy).
// We flip them so the action_service picks list first on mobile.
// Exception: calendar must stay as calendar view on mobile.

const viewRegistry = registry.category("views");

// We use a Set to track what we've already patched (avoids re-patching on UPDATE)
const alreadyPatched = new Set();

function patchMobileViews() {
    try {
        // 1. List becomes mobile-friendly (replaces kanban on mobile)
        if (!alreadyPatched.has("list")) {
            const list = viewRegistry.get("list");
            if (list) {
                list.isMobileFriendly = true;
                alreadyPatched.add("list");
            }
        }

        // 2. Kanban loses mobile-friendly (so list takes priority)
        if (!alreadyPatched.has("kanban")) {
            const kanban = viewRegistry.get("kanban");
            if (kanban) {
                kanban.isMobileFriendly = false;
                alreadyPatched.add("kanban");
            }
        }

        // 3. Calendar stays as calendar on mobile (must be mobile-friendly
        //    otherwise it gets replaced by list)
        if (!alreadyPatched.has("calendar")) {
            const calendar = viewRegistry.get("calendar");
            if (calendar) {
                calendar.isMobileFriendly = true;
                alreadyPatched.add("calendar");
            }
        }
    } catch (e) {
        // views not registered yet — will retry on next UPDATE
    }
}

viewRegistry.addEventListener("UPDATE", patchMobileViews);
patchMobileViews();
