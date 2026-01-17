"""Fix n8n_workflow_id unique constraint to be user-scoped

Revision ID: fix_workflow_unique
Revises: 61c8fbe2febd
Create Date: 2026-01-17 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_workflow_unique'
down_revision: Union[str, None] = '61c8fbe2febd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing unique constraint on n8n_workflow_id
    op.drop_index('ix_workflow_configs_n8n_workflow_id', table_name='workflow_configs')
    op.drop_constraint('workflow_configs_n8n_workflow_id_key', table_name='workflow_configs', type_='unique')

    # Create composite unique constraint on (user_id, n8n_workflow_id)
    op.create_unique_constraint('unique_user_n8n_workflow', 'workflow_configs', ['user_id', 'n8n_workflow_id'])

    # Recreate the index (without unique constraint)
    op.create_index(op.f('ix_workflow_configs_n8n_workflow_id'), 'workflow_configs', ['n8n_workflow_id'], unique=False)


def downgrade() -> None:
    # Drop the composite unique constraint
    op.drop_constraint('unique_user_n8n_workflow', table_name='workflow_configs', type_='unique')

    # Recreate the global unique constraint on n8n_workflow_id
    op.drop_index('ix_workflow_configs_n8n_workflow_id', table_name='workflow_configs')
    op.create_unique_constraint('workflow_configs_n8n_workflow_id_key', 'workflow_configs', ['n8n_workflow_id'])
    op.create_index(op.f('ix_workflow_configs_n8n_workflow_id'), 'workflow_configs', ['n8n_workflow_id'], unique=True)