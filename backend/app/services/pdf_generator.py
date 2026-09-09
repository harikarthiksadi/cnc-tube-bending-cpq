import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.core.config import (
    QUOTES_DIR,
    COMPANY_NAME,
    COMPANY_ADDRESS,
    COMPANY_PHONE,
    COMPANY_EMAIL
)

class PDFQuoteGenerator:
    """Generates branded PDF quotes matching CNC Pipe Bending Costing Version 3."""

    @classmethod
    def generate_quote_pdf(cls, quote_data: dict) -> Path:
        quote_num = quote_data.get("quote_number", f"QTE-{int(datetime.utcnow().timestamp())}")
        filename = f"{quote_num}.pdf"
        output_path = QUOTES_DIR / filename

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        primary_color = colors.HexColor("#0F172A")
        accent_color = colors.HexColor("#2563EB")
        highlight_bg = colors.HexColor("#F8FAFC")
        border_color = colors.HexColor("#CBD5E1")
        text_dark = colors.HexColor("#1E293B")
        text_muted = colors.HexColor("#64748B")

        cell_style = ParagraphStyle(
            "CellNormal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=text_dark
        )
        cell_bold = ParagraphStyle(
            "CellBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=text_dark
        )
        cell_accent = ParagraphStyle(
            "CellAccent",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=accent_color
        )
        section_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=primary_color,
            spaceAfter=4
        )

        story = []

        # 1. Header
        company_info = f"""<b><font size="12" color="#0F172A">{COMPANY_NAME}</font></b><br/>
<font size="8" color="#64748B">{COMPANY_ADDRESS}<br/>
Phone: {COMPANY_PHONE} &bull; Email: {COMPANY_EMAIL}<br/>
CNC Pipe & Tube Bending Division</font>
"""
        job_no = quote_data.get("job_number", "121")
        quote_header_info = f"""<b><font size="14" color="#2563EB">OFFICIAL QUOTATION</font></b><br/>
<b>Job No.:</b> {job_no}<br/>
<b>Quote #:</b> {quote_num}<br/>
<b>Date:</b> {datetime.utcnow().strftime("%Y-%m-%d")}<br/>
<b>Validity:</b> 30 Days
"""
        header_table = Table(
            [[Paragraph(company_info, cell_style), Paragraph(quote_header_info, cell_style)]],
            colWidths=[4.0 * inch, 3.2 * inch]
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=4, spaceAfter=10))

        # 2. Customer & Part Overview
        cust_name = quote_data.get("customer_name", "Valued Customer")
        cust_company = quote_data.get("customer_company", "Client Dynamics")
        shape = quote_data.get("tube_shape", "Square")
        size = quote_data.get("tube_size", "25x25")
        thick = quote_data.get("wall_thickness_mm", 1.5)
        mat = quote_data.get("material_code", "SS")

        cust_block = f"""<b>CUSTOMER DETAILS:</b><br/>
<b>{cust_name}</b><br/>
{cust_company}<br/>
Line Drawing / CAD Quote Reference
"""
        part_block = f"""<b>PIPE SPECIFICATIONS (Costing Version 3):</b><br/>
<b>Profile:</b> {shape} {size} ({thick}mm Thick)<br/>
<b>Material:</b> {mat} Stainless Steel<br/>
<b>Input Method:</b> 2D Paper Drawing / CAD Extraction
"""
        cust_table = Table(
            [[Paragraph(cust_block, cell_style), Paragraph(part_block, cell_style)]],
            colWidths=[3.6 * inch, 3.6 * inch]
        )
        cust_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), highlight_bg),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(cust_table)
        story.append(Spacer(1, 10))

        # 3. Geometry & Bends Breakdown
        bends_count = quote_data.get("detected_bends", 1)
        flat_len = quote_data.get("flattened_length_mm", 400.0)
        geom_data = [
            [
                Paragraph("<b>Number of Bends:</b>", cell_bold),
                Paragraph(f"{bends_count} Bend(s)", cell_style),
                Paragraph("<b>Total Flattened Cut Length:</b>", cell_bold),
                Paragraph(f"{flat_len:.1f} mm", cell_style),
            ]
        ]
        geom_table = Table(geom_data, colWidths=[1.8 * inch, 1.8 * inch, 1.8 * inch, 1.8 * inch])
        geom_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(geom_table)
        story.append(Spacer(1, 10))

        # 4. Itemized Quotation Breakdown (Matching Version 3)
        story.append(Paragraph("Labour Costing Breakdown (CNC Pipe / Tube Bending - Version 3)", section_style))
        qty = quote_data.get("quantity", 100)
        bend_rate = quote_data.get("bending_rate_per_pc", 30.0)
        cut_rate = quote_data.get("cutting_rate_per_pc", 5.0)
        setup_charge = quote_data.get("setting_charge", 500.0)
        rate_pc = quote_data.get("final_rate_per_piece", 40.0)
        total_labor = quote_data.get("total_job_cost", 4000.0)

        cost_table_data = [
            [
                Paragraph("<b>Operation Description</b>", cell_bold),
                Paragraph("<b>Rate Master Unit</b>", cell_bold),
                Paragraph("<b>Qty</b>", cell_bold),
                Paragraph("<b>Rate / Pc</b>", cell_bold),
                Paragraph("<b>Total Amount</b>", cell_bold)
            ],
            [
                Paragraph(f"<b>CNC Pipe Bending</b> ({bends_count} bend{'s' if bends_count>1 else ''} @ ₹{bend_rate:.2f}/bend)", cell_style),
                Paragraph(f"{shape} {size}", cell_style),
                Paragraph(str(qty), cell_style),
                Paragraph(f"₹{bend_rate * bends_count:.2f}", cell_style),
                Paragraph(f"₹{bend_rate * bends_count * qty:.2f}", cell_style)
            ],
            [
                Paragraph(f"<b>Precision Cold Cutting & Deburring</b>", cell_style),
                Paragraph("Cut to length", cell_style),
                Paragraph(str(qty), cell_style),
                Paragraph(f"₹{cut_rate:.2f}", cell_style),
                Paragraph(f"₹{cut_rate * qty:.2f}", cell_style)
            ],
            [
                Paragraph("<b>Machine Setting & Tooling Charge</b>", cell_style),
                Paragraph("Job Setup Lot", cell_style),
                Paragraph("1 Lot", cell_style),
                Paragraph(f"₹{setup_charge:.2f}", cell_style),
                Paragraph(f"₹{setup_charge:.2f}", cell_style)
            ],
            [
                Paragraph("<b>TOTAL LABOUR COST</b>", cell_accent),
                Paragraph("", cell_style),
                Paragraph(f"<b>{qty} pcs</b>", cell_bold),
                Paragraph(f"<b>₹{rate_pc:.2f} / pc</b>", cell_accent),
                Paragraph(f"<b>₹{total_labor:.2f}</b>", cell_accent)
            ]
        ]

        cost_table = Table(cost_table_data, colWidths=[3.2 * inch, 1.1 * inch, 0.7 * inch, 1.1 * inch, 1.1 * inch])
        cost_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("GRID", (0, 0), (-1, -1), 0.5, border_color),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EFF6FF")),
        ]))
        story.append(cost_table)
        story.append(Spacer(1, 10))

        # Terms
        terms_html = """<b>TERMS & CONDITIONS:</b><br/>
1. All rates in Indian Rupees (₹ INR) based on CNC Pipe Bending Costing Version 3.<br/>
2. Material supplied by client unless specified. Scrap and cutting allowance 5%.<br/>
3. Bend angle tolerance +/- 0.5 deg.
"""
        sign_block = """<b>CLIENT APPROVAL:</b><br/><br/>
Authorized Signature: _______________________<br/>
Date:                 _______________________
"""
        footer_table = Table(
            [[Paragraph(terms_html, cell_style), Paragraph(sign_block, cell_style)]],
            colWidths=[4.2 * inch, 3.0 * inch]
        )
        footer_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(KeepTogether(footer_table))

        doc.build(story)
        return output_path
