"""add user_id to linkedin_results

Revision ID: add_user_id_to_linkedin_results
Revises: drop_linkedin_results_fk
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = "add_user_id_to_linkedin_results"
down_revision = "drop_linkedin_results_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("linkedin_results", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index("ix_linkedin_results_user_id", "linkedin_results", ["user_id"])
    op.create_foreign_key(
        "fk_linkedin_results_user_id",
        "linkedin_results",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_linkedin_results_user_id", "linkedin_results", type_="foreignkey")
    op.drop_index("ix_linkedin_results_user_id", "linkedin_results")
    op.drop_column("linkedin_results", "user_id")
