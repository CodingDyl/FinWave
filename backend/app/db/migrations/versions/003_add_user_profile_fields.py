"""Add user profile fields

Revision ID: 003_add_user_profile_fields
Revises: 002_beneficiaries_destinations
Create Date: 2025-01-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_add_user_profile_fields'
down_revision: Union[str, Sequence[str], None] = '002_beneficiaries_destinations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to users table
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('picture', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the new columns
    op.drop_column('users', 'picture')
    op.drop_column('users', 'email')
    op.drop_column('users', 'name')
