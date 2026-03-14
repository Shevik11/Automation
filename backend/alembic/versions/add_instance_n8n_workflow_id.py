"""Add instance_n8n_workflow_id to workflow_executions

Revision ID: add_instance_n8n_workflow_id
Revises: add_google_auth_001
Create Date: 2026-02-22 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_instance_n8n_workflow_id"
down_revision: Union[str, None] = "add_google_auth_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workflow_executions",
        sa.Column("instance_n8n_workflow_id", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_workflow_executions_instance_n8n_workflow_id"),
        "workflow_executions",
        ["instance_n8n_workflow_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_workflow_executions_instance_n8n_workflow_id"),
        table_name="workflow_executions",
    )
    op.drop_column("workflow_executions", "instance_n8n_workflow_id")
