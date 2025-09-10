"""init tables

Revision ID: 001_init_tables
Revises: 
Create Date: 2025-01-10 22:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_init_tables'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('oauth_sub', sa.String(length=255), nullable=False),
        sa.Column('email_hash', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_oauth_sub'), 'users', ['oauth_sub'], unique=True)
    
    # Create payout_requests table
    op.create_table('payout_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('destination', sa.JSON(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=64), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'PAID', 'FAILED', name='payoutstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payout_requests_idempotency_key'), 'payout_requests', ['idempotency_key'], unique=False)
    op.create_index(op.f('ix_payout_requests_user_id'), 'payout_requests', ['user_id'], unique=False)
    op.create_unique_constraint('uq_payout_user_idempotency', 'payout_requests', ['user_id', 'idempotency_key'])
    
    # Create webhook_events table
    op.create_table('webhook_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=True),
        sa.Column('signature_header', sa.String(length=512), nullable=True),
        sa.Column('valid', sa.Boolean(), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webhook_events_provider'), 'webhook_events', ['provider'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_webhook_events_provider'), table_name='webhook_events')
    op.drop_table('webhook_events')
    op.drop_constraint('uq_payout_user_idempotency', 'payout_requests', type_='unique')
    op.drop_index(op.f('ix_payout_requests_user_id'), table_name='payout_requests')
    op.drop_index(op.f('ix_payout_requests_idempotency_key'), table_name='payout_requests')
    op.drop_table('payout_requests')
    op.drop_index(op.f('ix_users_oauth_sub'), table_name='users')
    op.drop_table('users')
