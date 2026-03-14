"""add hiring_manager_name to linkedin_results

Revision ID: add_hiring_manager_name
Revises: add_linkedin_result_columns
Create Date: 2026-03-08
"""
from alembic import op
import sqlalchemy as sa

revision = "add_hiring_manager_name"
down_revision = "add_linkedin_result_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("linkedin_results", sa.Column("hiring_manager_name", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("linkedin_results", "hiring_manager_name")
