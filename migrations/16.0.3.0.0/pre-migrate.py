"""Pré-migration : créer les colonnes favoris et pages épinglées sur res_users.

Lors de la mise à jour, l'ORM tente de lire res.users avant d'avoir ajouté
les nouvelles colonnes au schéma. Ce script les crée en amont via SQL.
"""


def migrate(cr, version):
    cr.execute("""
        ALTER TABLE res_users
            ADD COLUMN IF NOT EXISTS nova_favorite_app_ids TEXT DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS nova_pinned_pages TEXT DEFAULT '[]'
    """)
