"""add_iban_fields_to_destinations

Revision ID: 005
Revises: 004_add_stripe_payout_fields
Create Date: 2025-09-11 22:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004_add_stripe_payout_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add IBAN fields to payout_destinations table
    op.add_column('payout_destinations', sa.Column('account_number', sa.String(50), nullable=True))
    op.add_column('payout_destinations', sa.Column('routing_number', sa.String(20), nullable=True))
    op.add_column('payout_destinations', sa.Column('iban', sa.String(34), nullable=True))
    op.add_column('payout_destinations', sa.Column('bic', sa.String(11), nullable=True))


def downgrade():
    # Remove IBAN fields from payout_destinations table
    op.drop_column('payout_destinations', 'bic')
    op.drop_column('payout_destinations', 'iban')
    op.drop_column('payout_destinations', 'routing_number')
    op.drop_column('payout_destinations', 'account_number')
