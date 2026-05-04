"""add_previous_hash_to_audit_logs

Revision ID: c4fb45c396ec
Revises: fd8a7d8d530d
Create Date: 2026-05-04 16:24:40.831179

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4fb45c396ec'
down_revision: Union[str, Sequence[str], None] = 'fd8a7d8d530d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('audit_logs', sa.Column('previous_hash', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('audit_logs', 'previous_hash')
