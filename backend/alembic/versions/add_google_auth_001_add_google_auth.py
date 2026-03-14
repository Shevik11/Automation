"""Add google auth

Revision ID: add_google_auth_001
Revises: fix_workflow_unique
Create Date: 2026-01-17 15:25:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_google_auth_001"
down_revision: Union[str, None] = "fix_workflow_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Порожня міграція - Google аутентифікація не використовується
    pass


def downgrade() -> None:
    # Порожня міграція - Google аутентифікація не використовується
    pass
