import json

from odoo import models


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        result = super().session_info()
        user = self.env.user
        try:
            favorite_app_ids = json.loads(user.nova_favorite_app_ids or "[]")
        except (json.JSONDecodeError, TypeError):
            favorite_app_ids = []
        try:
            pinned_pages = json.loads(user.nova_pinned_pages or "[]")
        except (json.JSONDecodeError, TypeError):
            pinned_pages = []
        result["nova_theme"] = {
            "mode": user.nova_theme_mode or "light",
            "accent_color": user.nova_theme_accent_color or "indigo",
            "animations": user.nova_theme_animations,
            "sidebar_collapsed": user.nova_theme_sidebar_collapsed,
            "font_size": user.nova_theme_font_size or "default",
            "font_family": user.nova_theme_font_family or "inter",
            "favorite_app_ids": favorite_app_ids,
            "pinned_pages": pinned_pages,
        }
        return result
