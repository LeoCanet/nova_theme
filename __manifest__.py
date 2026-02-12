{
    "name": "Theme Nova",
    "summary": "Premium modern backend theme for Odoo 16 — SaaS-grade UI experience",
    "description": """
        Theme Nova transforms the Odoo 16 backend into a modern, elegant,
        and professional interface inspired by premium SaaS applications
        like Linear, Notion, and Stripe.

        Features:
        - iOS-style App Launcher grid with colored icons
        - Glassmorphism navbar with refined spacing
        - Collapsible sidebar navigation
        - Light & Dark mode with user toggle
        - Redesigned views (List, Kanban, Form, Calendar, Pivot, Graph)
        - Modern buttons, modals, and chatter
        - Micro-interactions and smooth animations
        - Per-user theme configuration (accent color, animations, sidebar)
        - Fully responsive design
    """,
    "author": "Arpasys",
    "website": "https://www.arpasys.com",
    "category": "Tools",
    "version": "16.0.1.0.0",
    "license": "LGPL-3",
    "depends": [
        "base",
        "web",
        "base_setup",
    ],
    "data": [
        "data/theme_data.xml",
        "views/res_config_settings_views.xml",
        "views/webclient_templates.xml",
    ],
    "assets": {
        "web._assets_primary_variables": [
            ("prepend", "nova_theme/static/src/scss/primary_variables.scss"),
        ],
        "web._assets_backend_helpers": [
            "nova_theme/static/src/scss/backend_helpers.scss",
        ],
        "web.assets_backend": [
            "nova_theme/static/src/scss/fonts.scss",
            "nova_theme/static/src/scss/design_system.scss",
            "nova_theme/static/src/scss/navbar.scss",
            "nova_theme/static/src/scss/sidebar.scss",
            "nova_theme/static/src/scss/app_launcher.scss",
            "nova_theme/static/src/scss/list_view.scss",
            "nova_theme/static/src/scss/kanban_view.scss",
            "nova_theme/static/src/scss/form_view.scss",
            "nova_theme/static/src/scss/calendar_pivot_graph.scss",
            "nova_theme/static/src/scss/buttons.scss",
            "nova_theme/static/src/scss/modals.scss",
            "nova_theme/static/src/scss/chatter.scss",
            "nova_theme/static/src/scss/dark_mode.scss",
            "nova_theme/static/src/scss/animations.scss",
            "nova_theme/static/src/scss/responsive.scss",
            "nova_theme/static/src/js/nova_app_launcher.js",
            "nova_theme/static/src/js/nova_sidebar.js",
            "nova_theme/static/src/js/nova_dark_mode.js",
            "nova_theme/static/src/js/nova_settings.js",
            "nova_theme/static/src/xml/app_launcher.xml",
            "nova_theme/static/src/xml/navbar.xml",
            "nova_theme/static/src/xml/sidebar.xml",
            "nova_theme/static/src/xml/button_box.xml",
            "nova_theme/static/src/xml/dark_mode_toggle.xml",
        ],
    },
    "images": [
        "static/description/icon.png",
    ],
    "installable": True,
    "auto_install": False,
    "application": True,
}
