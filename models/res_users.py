from odoo import fields, models

NOVA_THEME_FIELDS = [
    "nova_theme_mode",
    "nova_theme_accent_color",
    "nova_theme_animations",
    "nova_theme_sidebar_collapsed",
    "nova_theme_font_size",
    "nova_theme_font_family",
    "nova_favorite_app_ids",
    "nova_pinned_pages",
]


class ResUsers(models.Model):
    _inherit = "res.users"

    nova_theme_mode = fields.Selection(
        selection=[
            ("light", "Mode clair"),
            ("dark", "Mode sombre"),
            ("auto", "Préférence système"),
        ],
        string="Mode du thème",
        default="light",
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
    )
    nova_theme_animations = fields.Boolean(
        string="Activer les animations",
        default=True,
    )
    nova_theme_sidebar_collapsed = fields.Boolean(
        string="Barre latérale réduite par défaut",
        default=False,
    )
    nova_theme_font_size = fields.Selection(
        selection=[
            ("compact", "Compact"),
            ("default", "Défaut"),
            ("large", "Grand"),
        ],
        string="Taille de police",
        default="default",
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
            ("open-sauce", "Open Sauce One"),
        ],
        string="Police de caractères",
        default="inter",
    )
    nova_favorite_app_ids = fields.Text(
        string="Applications favorites",
        default="[]",
    )
    nova_pinned_pages = fields.Text(
        string="Pages épinglées",
        default="[]",
    )

    def __init__(self, pool, cr, inst):
        init_res = super().__init__(pool, cr, inst)
        type(self).SELF_WRITEABLE_FIELDS = self.SELF_WRITEABLE_FIELDS + NOVA_THEME_FIELDS
        type(self).SELF_READABLE_FIELDS = self.SELF_READABLE_FIELDS + NOVA_THEME_FIELDS
        return init_res
