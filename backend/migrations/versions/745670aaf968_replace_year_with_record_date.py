"""replace_year_with_record_date

Revision ID: 745670aaf968
Revises: c9fba1fa612a
Create Date: 2026-04-28 00:31:24.660596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '745670aaf968'
down_revision: Union[str, Sequence[str], None] = 'c9fba1fa612a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add column as nullable
    op.add_column('inventory_records', sa.Column('record_date', sa.Date(), nullable=True))
    
    # 2. Populate record_date from year (e.g. 2024 -> 2024-01-01)
    op.execute("UPDATE inventory_records SET record_date = TO_DATE(year::text || '-01-01', 'YYYY-MM-DD')")
    
    # 3. Alter column to NOT NULL
    op.alter_column('inventory_records', 'record_date', nullable=False)
    
    # 4. Drop the old column
    op.drop_column('inventory_records', 'year')

def downgrade() -> None:
    """Downgrade schema."""
    # 1. Add year back as nullable
    op.add_column('inventory_records', sa.Column('year', sa.SMALLINT(), autoincrement=False, nullable=True))
    
    # 2. Extract year from record_date
    op.execute("UPDATE inventory_records SET year = EXTRACT(YEAR FROM record_date)::SMALLINT")
    
    # 3. Alter column to NOT NULL
    op.alter_column('inventory_records', 'year', nullable=False)
    
    # 4. Drop record_date
    op.drop_column('inventory_records', 'record_date')
