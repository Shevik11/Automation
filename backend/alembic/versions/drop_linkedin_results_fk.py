"""Drop foreign key constraint on linkedin_results.workflow_execution_id

Revision ID: drop_linkedin_results_fk
Revises: make_workflow_execution_id_nullable
Create Date: 2026-03-08
"""
from alembic import op

revision = "drop_linkedin_results_fk"
down_revision = "make_workflow_execution_id_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "linkedin_results_workflow_execution_id_fkey",
        "linkedin_results",
        "workflow_executions",
        ["workflow_execution_id"],
        ["id"],
        ondelete="SET NULL",
    )
