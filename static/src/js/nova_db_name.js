/** @odoo-module **/

import { registry } from "@web/core/registry";

registry.category("user_menuitems").add("nova_db_name", (env) => {
    const dbName = (odoo.info && odoo.info.db) || "";
    return {
        type: "item",
        id: "nova_db_name",
        description: `BDD : ${dbName}`,
        callback: () => {},
        sequence: 1,
        hide: !odoo.debug,
    };
});
