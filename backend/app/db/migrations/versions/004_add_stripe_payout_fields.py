"""Add Stripe payout fields

Revision ID: 004_add_stripe_payout_fields
Revises: 003_add_user_profile_fields
Create Date: 2025-01-11 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import DateTime

# revision identifiers, used by Alembic.
revision: str = '004_add_stripe_payout_fields'
down_revision: Union[str, Sequence[str], None] = '003_add_user_profile_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new Stripe-related columns to payout_requests table
    op.add_column('payout_requests', sa.Column('stripe_payout_id', sa.String(length=255), nullable=True))
    op.add_column('payout_requests', sa.Column('stripe_balance_transaction', sa.String(length=255), nullable=True))
    op.add_column('payout_requests', sa.Column('arrival_date', DateTime(timezone=True), nullable=True))
    op.add_column('payout_requests', sa.Column('processed_at', DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the new columns
    op.drop_column('payout_requests', 'processed_at')
    op.drop_column('payout_requests', 'arrival_date')
    op.drop_column('payout_requests', 'stripe_balance_transaction')
    op.drop_column('payout_requests', 'stripe_payout_id')
