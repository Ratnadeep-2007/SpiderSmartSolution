"""add user_id to user model

Revision ID: c422305d4d11
Revises: 870578a39a8f
Create Date: 2026-05-01 19:13:30.193712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c422305d4d11'
down_revision: Union[str, Sequence[str], None] = '870578a39a8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adding user_id column to users table
    op.add_column('users', sa.Column('user_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_column('users', 'user_id')
