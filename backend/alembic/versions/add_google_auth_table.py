"""Add google_auth table

Revision ID: add_google_auth_001
Revises: 61c8fbe2febd
Create Date: 2025-12-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_google_auth_001'
down_revision: Union[str, None] = '61c8fbe2febd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table exists before creating
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'google_auth' not in inspector.get_table_names():
        op.create_table(
            'google_auth',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('access_token', sa.Text(), nullable=False),
            sa.Column('refresh_token', sa.Text(), nullable=True),
            sa.Column('token_expiry', sa.DateTime(timezone=True), nullable=True),
            sa.Column('spreadsheet_id', sa.String(), nullable=True),
            sa.Column('spreadsheet_url', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id')
        )
        op.create_index(op.f('ix_google_auth_user_id'), 'google_auth', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_google_auth_user_id'), table_name='google_auth')
    op.drop_table('google_auth')

