"""Add beneficiaries and destinations tables

Revision ID: 002_beneficiaries_destinations
Revises: 001_init_tables
Create Date: 2025-01-10 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_beneficiaries_destinations'
down_revision: Union[str, Sequence[str], None] = '001_init_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create beneficiaries table
    op.create_table('beneficiaries',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('INDIVIDUAL', 'BUSINESS', name='beneficiarytype'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email_hash', sa.String(length=64), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_beneficiaries_user_id'), 'beneficiaries', ['user_id'], unique=False)
    
    # Create payout_destinations table
    op.create_table('payout_destinations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('beneficiary_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.Enum('BANK_ACCOUNT', 'CARD', name='destinationtype'), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('last4', sa.String(length=4), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('status', sa.Enum('UNVERIFIED', 'VERIFIED', name='destinationstatus'), nullable=False),
        sa.Column('external_token', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['beneficiary_id'], ['beneficiaries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payout_destinations_beneficiary_id'), 'payout_destinations', ['beneficiary_id'], unique=False)
    
    # Update payout_requests table
    op.add_column('payout_requests', sa.Column('beneficiary_id', sa.String(length=36), nullable=True))
    op.add_column('payout_requests', sa.Column('destination_id', sa.String(length=36), nullable=True))
    op.add_column('payout_requests', sa.Column('memo', sa.Text(), nullable=True))
    op.add_column('payout_requests', sa.Column('external_id', sa.String(length=255), nullable=True))
    op.add_column('payout_requests', sa.Column('failure_code', sa.String(length=50), nullable=True))
    op.add_column('payout_requests', sa.Column('failure_message', sa.Text(), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_payout_requests_beneficiary_id', 'payout_requests', 'beneficiaries', ['beneficiary_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_payout_requests_destination_id', 'payout_requests', 'payout_destinations', ['destination_id'], ['id'], ondelete='CASCADE')
    
    # Add indexes
    op.create_index(op.f('ix_payout_requests_beneficiary_id'), 'payout_requests', ['beneficiary_id'], unique=False)
    op.create_index(op.f('ix_payout_requests_destination_id'), 'payout_requests', ['destination_id'], unique=False)
    
    # Update PayoutStatus enum to include CANCELED
    op.execute("ALTER TYPE payoutstatus ADD VALUE 'CANCELED'")
    
    # Remove old destination column
    op.drop_column('payout_requests', 'destination')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the old destination column
    op.add_column('payout_requests', sa.Column('destination', sa.JSON(), nullable=False))
    
    # Remove new columns from payout_requests
    op.drop_index(op.f('ix_payout_requests_destination_id'), table_name='payout_requests')
    op.drop_index(op.f('ix_payout_requests_beneficiary_id'), table_name='payout_requests')
    op.drop_constraint('fk_payout_requests_destination_id', 'payout_requests', type_='foreignkey')
    op.drop_constraint('fk_payout_requests_beneficiary_id', 'payout_requests', type_='foreignkey')
    op.drop_column('payout_requests', 'failure_message')
    op.drop_column('payout_requests', 'failure_code')
    op.drop_column('payout_requests', 'external_id')
    op.drop_column('payout_requests', 'memo')
    op.drop_column('payout_requests', 'destination_id')
    op.drop_column('payout_requests', 'beneficiary_id')
    
    # Drop tables
    op.drop_index(op.f('ix_payout_destinations_beneficiary_id'), table_name='payout_destinations')
    op.drop_table('payout_destinations')
    op.drop_index(op.f('ix_beneficiaries_user_id'), table_name='beneficiaries')
    op.drop_table('beneficiaries')
    
    # Note: CANCELED enum value cannot be easily removed in PostgreSQL
