from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    nova_theme_mode = fields.Selection(
        selection=[
            ("light", "Light Mode"),
            ("dark", "Dark Mode"),
            ("auto", "System Preference"),
        ],
        string="Theme Mode",
        default="light",
        config_parameter="nova_theme.mode",
    )
    nova_theme_accent_color = fields.Selection(
        selection=[
            ("indigo", "Indigo"),
            ("blue", "Ocean Blue"),
            ("emerald", "Emerald"),
            ("rose", "Rose"),
            ("amber", "Amber"),
            ("violet", "Violet"),
        ],
        string="Accent Color",
        default="indigo",
        config_parameter="nova_theme.accent_color",
    )
    nova_theme_animations = fields.Boolean(
        string="Enable Animations",
        default=True,
        config_parameter="nova_theme.animations",
    )
    nova_theme_sidebar_collapsed = fields.Boolean(
        string="Sidebar Collapsed by Default",
        default=False,
        config_parameter="nova_theme.sidebar_collapsed",
    )
