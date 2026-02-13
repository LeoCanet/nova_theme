from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    nova_theme_mode = fields.Selection(
        selection=[
            ("light", "Mode clair"),
            ("dark", "Mode sombre"),
            ("auto", "Préférence système"),
        ],
        string="Mode du thème",
        default="light",
        config_parameter="nova_theme.mode",
    )
    nova_theme_accent_color = fields.Selection(
        selection=[
            ("indigo", "Indigo"),
            ("blue", "Bleu océan"),
            ("emerald", "Émeraude"),
            ("rose", "Rose"),
            ("amber", "Ambre"),
            ("violet", "Violet"),
        ],
        string="Couleur d'accent",
        default="indigo",
        config_parameter="nova_theme.accent_color",
    )
    nova_theme_animations = fields.Boolean(
        string="Activer les animations",
        default=True,
        config_parameter="nova_theme.animations",
    )
    nova_theme_sidebar_collapsed = fields.Boolean(
        string="Barre latérale réduite par défaut",
        default=False,
        config_parameter="nova_theme.sidebar_collapsed",
    )
    nova_theme_font_size = fields.Selection(
        selection=[
            ("compact", "Compact"),
            ("default", "Défaut"),
            ("large", "Grand"),
        ],
        string="Taille de police",
        default="default",
        config_parameter="nova_theme.font_size",
    )
    nova_theme_font_family = fields.Selection(
        selection=[
            ("inter", "Inter"),
            ("roboto", "Roboto"),
            ("poppins", "Poppins"),
            ("lato", "Lato"),
            ("montserrat", "Montserrat"),
            ("open-sans", "Open Sans"),
            ("ibm-plex", "IBM Plex Sans"),
        ],
        string="Police de caractères",
        default="inter",
        config_parameter="nova_theme.font_family",
    )
