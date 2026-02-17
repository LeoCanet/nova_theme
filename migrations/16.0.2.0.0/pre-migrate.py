"""Pré-migration : créer les colonnes nova_theme sur res_users.

Lors de la mise à jour, l'ORM tente de lire res.users (authentification,
session) avant d'avoir ajouté les nouvelles colonnes au schéma.
Ce script les crée en amont via SQL pour éviter l'erreur
UndefinedColumn.
"""


def migrate(cr, version):
    cr.execute("""
        ALTER TABLE res_users
            ADD COLUMN IF NOT EXISTS nova_theme_mode VARCHAR DEFAULT 'light',
            ADD COLUMN IF NOT EXISTS nova_theme_accent_color VARCHAR DEFAULT 'indigo',
            ADD COLUMN IF NOT EXISTS nova_theme_animations BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS nova_theme_sidebar_collapsed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS nova_theme_font_size VARCHAR DEFAULT 'default',
            ADD COLUMN IF NOT EXISTS nova_theme_font_family VARCHAR DEFAULT 'inter'
    """)
