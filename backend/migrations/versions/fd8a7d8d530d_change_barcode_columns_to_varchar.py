"""change_barcode_columns_to_varchar

Revision ID: fd8a7d8d530d
Revises: c422305d4d11
Create Date: 2026-05-02 14:49:32.070428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fd8a7d8d530d'
down_revision: Union[str, Sequence[str], None] = 'c422305d4d11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Drop the generated column search_vector
    # Using execute since drop_column might not handle the generated aspect properly in all Alembic versions
    op.execute("ALTER TABLE inventory_records DROP COLUMN IF EXISTS search_vector")

    # 2. Alter box_barcode column
    op.alter_column('inventory_records', 'box_barcode',
               existing_type=sa.CHAR(length=11),
               type_=sa.String(length=50),
               existing_nullable=False)
    
    # 3. Alter file_barcode column
    op.alter_column('inventory_records', 'file_barcode',
               existing_type=sa.CHAR(length=13),
               type_=sa.String(length=50),
               existing_nullable=False)

    # 4. Re-create the generated column search_vector
    op.execute("""
        ALTER TABLE inventory_records ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(description, '') || ' ' || 
            coalesce(entity, '') || ' ' || 
            coalesce(department, '') || ' ' || 
            coalesce(entity_type, '') || ' ' || 
            coalesce(location, '') || ' ' || 
            coalesce(box_barcode, '') || ' ' || 
            coalesce(file_barcode, ''))
        ) STORED
    """)
    
    # 5. Re-create the index for search_vector
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_records_search_vector ON inventory_records USING gin(search_vector)")

def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop the generated column
    op.execute("ALTER TABLE inventory_records DROP COLUMN IF EXISTS search_vector")

    # 2. Alter columns back
    op.alter_column('inventory_records', 'file_barcode',
               existing_type=sa.String(length=50),
               type_=sa.CHAR(length=13),
               existing_nullable=False)
    op.alter_column('inventory_records', 'box_barcode',
               existing_type=sa.String(length=50),
               type_=sa.CHAR(length=11),
               existing_nullable=False)

    # 3. Re-create the generated column
    op.execute("""
        ALTER TABLE inventory_records ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(description, '') || ' ' || 
            coalesce(entity, '') || ' ' || 
            coalesce(department, '') || ' ' || 
            coalesce(entity_type, '') || ' ' || 
            coalesce(location, '') || ' ' || 
            coalesce(box_barcode, '') || ' ' || 
            coalesce(file_barcode, ''))
        ) STORED
    """)
    
    # 4. Re-create the index
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_records_search_vector ON inventory_records USING gin(search_vector)")
