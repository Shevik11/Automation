"""Add company_name, company_linkedin_page, detail to linkedin_results

Revision ID: add_linkedin_result_columns
Revises: add_instance_n8n_workflow_id
Create Date: 2026-03-08 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_linkedin_result_columns"
down_revision: Union[str, None] = "add_instance_n8n_workflow_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "linkedin_results",
        sa.Column("company_name", sa.String(), nullable=True),
    )
    op.add_column(
        "linkedin_results",
        sa.Column("company_linkedin_page", sa.String(), nullable=True),
    )
    op.add_column(
        "linkedin_results",
        sa.Column("detail", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("linkedin_results", "detail")
    op.drop_column("linkedin_results", "company_linkedin_page")
    op.drop_column("linkedin_results", "company_name")
