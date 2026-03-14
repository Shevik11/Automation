"""add unique constraint on vacancy_link

Revision ID: add_vacancy_link_unique
Revises: add_hiring_manager_name
Create Date: 2026-03-08
"""
from alembic import op

revision = "add_vacancy_link_unique"
down_revision = "add_hiring_manager_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_linkedin_results_vacancy_link",
        "linkedin_results",
        ["vacancy_link"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_linkedin_results_vacancy_link",
        "linkedin_results",
        type_="unique",
    )
