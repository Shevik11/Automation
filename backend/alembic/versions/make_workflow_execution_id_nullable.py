"""make workflow_execution_id nullable

Revision ID: make_workflow_execution_id_nullable
Revises: add_vacancy_link_unique
Create Date: 2026-03-08
"""
from alembic import op
import sqlalchemy as sa

revision = "make_workflow_execution_id_nullable"
down_revision = "add_vacancy_link_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "linkedin_results",
        "workflow_execution_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.drop_constraint(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        "workflow_executions",
        ["workflow_execution_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        "workflow_executions",
        ["workflow_execution_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column(
        "linkedin_results",
        "workflow_execution_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
