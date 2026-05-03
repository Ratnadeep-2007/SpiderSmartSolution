import io
import uuid
from typing import List, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..models.record import InventoryRecord

# Optional dependency: WeasyPrint (requires GTK on Windows)
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

async def generate_records_pdf(db: AsyncSession, record_ids: List[uuid.UUID]) -> io.BytesIO:
    """
    Generates a formatted PDF for a list of records.
    Returns a dummy PDF or error if WeasyPrint is not configured.
    """
    if not WEASYPRINT_AVAILABLE:
        # Fallback: Create a simple text file if PDF engine is missing
        buffer = io.BytesIO()
        buffer.write(b"PDF Generation Error: WeasyPrint dependencies (GTK/GObject) missing on host system.\n")
        buffer.write(f"Record IDs: {str(record_ids).encode()}".encode())
        buffer.seek(0)
        return buffer

    result = await db.execute(
        select(InventoryRecord).where(InventoryRecord.id.in_(record_ids))
    )
    records = result.scalars().all()

    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: sans-serif; font-size: 12px; }}
                h1 {{ color: #0ea5e9; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f8fafc; font-weight: bold; }}
                .barcode {{ font-family: monospace; font-weight: bold; }}
            </style>
        </head>
        <body>
            <h1>SpiderSmart Inventory Report</h1>
            <p>Generated on: {uuid.uuid4().hex[:8]}</p>
            <table>
                <thead>
                    <tr>
                        <th>Box Barcode</th>
                        <th>File Barcode</th>
                        <th>Entity</th>
                        <th>Department</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    """

    for r in records:
        html_content += f"""
                    <tr>
                        <td class="barcode">{r.box_barcode}</td>
                        <td class="barcode">{r.file_barcode}</td>
                        <td>{r.entity}</td>
                        <td>{r.department}</td>
                        <td>{r.record_date}</td>
                        <td>{r.disposition_status}</td>
                    </tr>
        """

    html_content += """
                </tbody>
            </table>
        </body>
    </html>
    """

    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    return pdf_buffer

async def generate_records_xlsx(db: AsyncSession, record_ids: List[uuid.UUID]) -> io.BytesIO:
    """
    Generates an Excel spreadsheet for a list of records.
    """
    if not OPENPYXL_AVAILABLE:
        buffer = io.BytesIO()
        buffer.write(b"Error: openpyxl library missing.\n")
        buffer.seek(0)
        return buffer

    result = await db.execute(
        select(InventoryRecord).where(InventoryRecord.id.in_(record_ids))
    )
    records = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventory Records"

    # Header
    headers = ["ID", "Box Barcode", "File Barcode", "Entity", "Department", "Location", "Date", "Status", "Description"]
    ws.append(headers)

    # Style header
    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
        cell.fill = openpyxl.styles.PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid")

    for r in records:
        ws.append([
            str(r.id),
            r.box_barcode,
            r.file_barcode,
            r.entity,
            r.department,
            r.location,
            str(r.record_date),
            r.disposition_status,
            r.description
        ])

    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column].width = min(adjusted_width, 50)

    xlsx_buffer = io.BytesIO()
    wb.save(xlsx_buffer)
    xlsx_buffer.seek(0)
    return xlsx_buffer
