"""fix missing name column

Revision ID: 870578a39a8f
Revises: 745670aaf968
Create Date: 2026-04-30 14:43:53.221803

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '870578a39a8f'
down_revision: Union[str, Sequence[str], None] = '745670aaf968'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to record_type_fields
    op.add_column('record_type_fields', sa.Column('name', sa.Text(), nullable=True))
    op.add_column('record_type_fields', sa.Column('label', sa.Text(), nullable=True))
    
    # Update existing rows if any (though likely empty or non-critical for seed)
    op.execute("UPDATE record_type_fields SET name = field_name, label = field_name WHERE name IS NULL")
    
    # Make them non-nullable
    op.alter_column('record_type_fields', 'name', nullable=False)
    op.alter_column('record_type_fields', 'label', nullable=False)
    
    # Drop old column
    op.drop_column('record_type_fields', 'field_name')


def downgrade() -> None:
    op.add_column('record_type_fields', sa.Column('field_name', sa.Text(), nullable=True))
    op.execute("UPDATE record_type_fields SET field_name = name")
    op.alter_column('record_type_fields', 'field_name', nullable=False)
    op.drop_column('record_type_fields', 'label')
    op.drop_column('record_type_fields', 'name')
