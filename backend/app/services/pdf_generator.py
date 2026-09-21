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
    KeepTogether,
    Image
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
    """Generates branded PDF quotes matching CNC Pipe Bending Costing Version 3 with Material & GST."""

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
        accent_color = colors.HexColor("#0066FF")       # Samsung Electric Blue
        secondary_color = colors.HexColor("#00A3C4")    # Titanium Ice Cyan
        border_color = colors.HexColor("#CBD5E1")
        highlight_bg = colors.HexColor("#F8FAFC")
        text_dark = colors.HexColor("#1E293B")
        text_muted = colors.HexColor("#64748B")

        cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
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
            fontSize=10.5,
            leading=14,
            textColor=primary_color,
            spaceAfter=4
        )

        story = []

        # 1. Header with dynamic Vendor Company
        vendor_name = quote_data.get("vendor_company_name") or COMPANY_NAME
        vendor_tagline = quote_data.get("vendor_tagline") or "CNC Rotary Draw Bending & Metal Fabrication"
        vendor_addr = quote_data.get("vendor_address") or COMPANY_ADDRESS
        vendor_phone = quote_data.get("vendor_phone") or COMPANY_PHONE
        vendor_email = quote_data.get("vendor_email") or COMPANY_EMAIL
        vendor_gstin = quote_data.get("vendor_gstin") or "29AAACK1234M1Z5"
        validity = quote_data.get("validity_days", 30)
        lead_time = quote_data.get("lead_time", "5 – 7 Business Days")
        payment_terms = quote_data.get("payment_terms", "50% Advance with PO, Balance before dispatch")
        delivery_terms = quote_data.get("delivery_terms", "Ex-Works Factory")
        notes = quote_data.get("notes", "")

        company_info = f"""<b><font size="13" color="#0066FF">{vendor_name}</font></b><br/>
<font size="7.5" color="#0F172A"><b>{vendor_tagline}</b></font><br/>
<font size="8" color="#64748B">{vendor_addr}<br/>
Phone: {vendor_phone} &bull; Email: {vendor_email}<br/>
<b>GSTIN:</b> {vendor_gstin} &bull; CNC Pipe & Tube Bending Division</font>
"""
        job_no = quote_data.get("job_number", "121")
        material_mode = quote_data.get("material_mode", "making_cost_only")
        is_with_mat = (material_mode == "with_material")
        scope_badge = "FULL SUPPLY (WITH MATERIAL)" if is_with_mat else "JOB WORK / MAKING CHARGES ONLY"

        quote_header_info = f"""<b><font size="13" color="#0066FF">OFFICIAL QUOTATION</font></b><br/>
<b>Quote #:</b> {quote_num}<br/>
<b>Job No.:</b> {job_no}<br/>
<b>Date:</b> {datetime.utcnow().strftime("%d-%b-%Y")}<br/>
<b>Scope:</b> <font color="#00A3C4"><b>{scope_badge}</b></font><br/>
<b>Validity:</b> {validity} Days &bull; <b>Lead Time:</b> {lead_time}
"""
        # Build left-side header: logo + company text
        LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "krishna_logo.png"
        if LOGO_PATH.exists():
            logo_img = Image(str(LOGO_PATH), width=1.4 * inch, height=0.32 * inch)
            company_left = Table(
                [[logo_img], [Paragraph(company_info, cell_style)]],
                colWidths=[4.1 * inch]
            )
            company_left.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
            ]))
        else:
            company_left = Paragraph(company_info, cell_style)

        header_table = Table(
            [[company_left, Paragraph(quote_header_info, cell_style)]],
            colWidths=[4.1 * inch, 3.1 * inch]
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=2, spaceAfter=8))

        # 2. Customer & Part Overview
        cust_name = quote_data.get("customer_name", "Valued Customer")
        cust_company = quote_data.get("customer_company", "Client Dynamics Corp")
        cust_gstin = quote_data.get("customer_gstin", "")
        shape = quote_data.get("tube_shape", "Square")
        size = quote_data.get("tube_size", "25x25")
        thick = quote_data.get("wall_thickness_mm", 1.5)
        mat = quote_data.get("material_code", "SS")
        mat_display = quote_data.get("material_name", f"{mat} Stainless Steel")

        cust_gst_line = f"<b>GSTIN:</b> {cust_gstin}<br/>" if cust_gstin else ""
        cust_block = f"""<b>CUSTOMER / BILL TO:</b><br/>
<b>{cust_name}</b><br/>
{cust_company}<br/>
{cust_gst_line}
Line Drawing / CAD Quote Reference
"""
        part_block = f"""<b>PIPE & TUBE SPECIFICATIONS:</b><br/>
<b>Profile:</b> {shape} {size} ({thick} mm Wall Thickness)<br/>
<b>Material Grade:</b> {mat_display}<br/>
<b>Sourcing:</b> {"Material Included (Full Supply)" if is_with_mat else "Customer Supplied Raw Tube (Labor Only)"}
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
        story.append(Spacer(1, 8))

        # 3. Geometry & Bends Breakdown
        bends_count = quote_data.get("detected_bends", 1)
        flat_len = quote_data.get("flattened_length_mm", 400.0)
        weight_kg = quote_data.get("tube_weight_kg", 0.0)
        
        geom_data = [
            [
                Paragraph("<b>Detected Bends:</b>", cell_bold),
                Paragraph(f"{bends_count} Bend(s)", cell_style),
                Paragraph("<b>Cut Length:</b>", cell_bold),
                Paragraph(f"{flat_len:.1f} mm", cell_style),
                Paragraph("<b>Unit Weight:</b>", cell_bold),
                Paragraph(f"{weight_kg:.3f} kg/pc" if weight_kg > 0 else "N/A", cell_style),
            ]
        ]
        geom_table = Table(geom_data, colWidths=[1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch])
        geom_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
        ]))
        story.append(geom_table)
        story.append(Spacer(1, 8))

        # 4. Itemized Costing Table (Material + Labor + Setup + GST)
        story.append(Paragraph("Commercial Cost Breakdown (CNC Pipe & Tube Bending - Version 3)", section_style))
        qty = quote_data.get("quantity", 100)
        bend_rate = quote_data.get("bending_rate_per_pc", 30.0)
        cut_rate = quote_data.get("cutting_rate_per_pc", 5.0)
        setup_charge = quote_data.get("setting_charge", 500.0)
        rate_pc_excl = quote_data.get("final_rate_per_piece", 40.0)
        taxable_subtotal = quote_data.get("total_job_cost", 4000.0)
        mat_cost_pc = quote_data.get("material_cost_per_piece", 0.0)
        mat_rate_kg = quote_data.get("material_rate_per_kg", 280.0)
        scrap_pct = quote_data.get("scrap_allowance_pct", 5.0)

        gst_type = quote_data.get("gst_type", "intra_state")
        gst_rate = quote_data.get("gst_rate_pct", 18.0)
        cgst_amt = quote_data.get("cgst_amount", round(taxable_subtotal * 0.09, 2) if gst_type == "intra_state" else 0.0)
        sgst_amt = quote_data.get("sgst_amount", round(taxable_subtotal * 0.09, 2) if gst_type == "intra_state" else 0.0)
        igst_amt = quote_data.get("igst_amount", round(taxable_subtotal * 0.18, 2) if gst_type == "inter_state" else 0.0)
        total_gst = quote_data.get("total_gst_amount", (cgst_amt + sgst_amt + igst_amt))
        grand_total = quote_data.get("grand_total", round(taxable_subtotal + total_gst, 2))
        rate_pc_incl = round(grand_total / max(1, qty), 2)

        cost_table_data = [
            [
                Paragraph("<b>Item / Operation Description</b>", cell_bold),
                Paragraph("<b>HSN/SAC</b>", cell_bold),
                Paragraph("<b>Qty</b>", cell_bold),
                Paragraph("<b>Rate / Unit</b>", cell_bold),
                Paragraph("<b>Taxable Amount</b>", cell_bold)
            ]
        ]

        # Line 1: Raw Material (if with_material)
        if is_with_mat:
            mat_desc = f"<b>Raw Tube Supply:</b> {mat} {shape} {size} ({weight_kg:.3f} kg @ ₹{mat_rate_kg:.1f}/kg + {scrap_pct}% clamp allowance)"
            cost_table_data.append([
                Paragraph(mat_desc, cell_style),
                Paragraph("HSN 7306", cell_style),
                Paragraph(f"{qty} pcs", cell_style),
                Paragraph(f"₹{mat_cost_pc:.2f}", cell_style),
                Paragraph(f"₹{mat_cost_pc * qty:.2f}", cell_style)
            ])
        else:
            cost_table_data.append([
                Paragraph("<b>Raw Material:</b> Supplied by Client <i>(Labor/Job Work only)</i>", cell_style),
                Paragraph("SAC 9988", cell_style),
                Paragraph(f"{qty} pcs", cell_style),
                Paragraph("₹0.00", cell_style),
                Paragraph("₹0.00", cell_style)
            ])

        # Line 2: CNC Bending
        cost_table_data.append([
            Paragraph(f"<b>CNC Pipe Bending:</b> {bends_count} bend{'s' if bends_count>1 else ''} @ ₹{bend_rate:.2f}/bend", cell_style),
            Paragraph("SAC 9988", cell_style),
            Paragraph(f"{qty} pcs", cell_style),
            Paragraph(f"₹{bend_rate * bends_count:.2f}", cell_style),
            Paragraph(f"₹{bend_rate * bends_count * qty:.2f}", cell_style)
        ])

        # Line 3: Cutting & Deburring
        cost_table_data.append([
            Paragraph("<b>Precision Cold Cutting & Deburring:</b> Cut to length", cell_style),
            Paragraph("SAC 9988", cell_style),
            Paragraph(f"{qty} pcs", cell_style),
            Paragraph(f"₹{cut_rate:.2f}", cell_style),
            Paragraph(f"₹{cut_rate * qty:.2f}", cell_style)
        ])

        # Line 4: Machine Setting Lot
        cost_table_data.append([
            Paragraph("<b>Machine Setting & Mandrel Tooling Charge:</b> 1 Lot setup", cell_style),
            Paragraph("SAC 9988", cell_style),
            Paragraph("1 Lot", cell_style),
            Paragraph(f"₹{setup_charge:.2f}", cell_style),
            Paragraph(f"₹{setup_charge:.2f}", cell_style)
        ])

        # Line 5: Taxable Subtotal
        cost_table_data.append([
            Paragraph("<b>TAXABLE SUBTOTAL (Excl. GST)</b>", cell_bold),
            Paragraph("", cell_style),
            Paragraph(f"<b>{qty} pcs</b>", cell_bold),
            Paragraph(f"<b>₹{rate_pc_excl:.2f} / pc</b>", cell_bold),
            Paragraph(f"<b>₹{taxable_subtotal:.2f}</b>", cell_bold)
        ])

        # Taxes
        if gst_type == "intra_state" and total_gst > 0:
            cost_table_data.append([
                Paragraph("<b>CGST (Central Goods and Services Tax @ 9.0%)</b>", cell_style),
                Paragraph("", cell_style),
                Paragraph("", cell_style),
                Paragraph(f"₹{round(cgst_amt/max(1,qty), 2):.2f}/pc", cell_style),
                Paragraph(f"₹{cgst_amt:.2f}", cell_style)
            ])
            cost_table_data.append([
                Paragraph("<b>SGST (State Goods and Services Tax @ 9.0%)</b>", cell_style),
                Paragraph("", cell_style),
                Paragraph("", cell_style),
                Paragraph(f"₹{round(sgst_amt/max(1,qty), 2):.2f}/pc", cell_style),
                Paragraph(f"₹{sgst_amt:.2f}", cell_style)
            ])
        elif gst_type == "inter_state" and total_gst > 0:
            cost_table_data.append([
                Paragraph(f"<b>IGST (Integrated GST @ {gst_rate:.1f}%)</b>", cell_style),
                Paragraph("", cell_style),
                Paragraph("", cell_style),
                Paragraph(f"₹{round(igst_amt/max(1,qty), 2):.2f}/pc", cell_style),
                Paragraph(f"₹{igst_amt:.2f}", cell_style)
            ])
        else:
            cost_table_data.append([
                Paragraph("<b>GST:</b> Tax Exempt / Zero Rated", cell_style),
                Paragraph("", cell_style),
                Paragraph("", cell_style),
                Paragraph("₹0.00", cell_style),
                Paragraph("₹0.00", cell_style)
            ])

        # Final Grand Total Line
        cost_table_data.append([
            Paragraph("<b>GRAND TOTAL (ALL-INCLUSIVE)</b>", cell_accent),
            Paragraph("", cell_style),
            Paragraph(f"<b>{qty} pcs</b>", cell_bold),
            Paragraph(f"<b>₹{rate_pc_incl:.2f} / pc</b>", cell_accent),
            Paragraph(f"<b>₹{grand_total:.2f}</b>", cell_accent)
        ])

        cost_table = Table(cost_table_data, colWidths=[3.2 * inch, 0.9 * inch, 0.7 * inch, 1.2 * inch, 1.2 * inch])
        cost_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("GRID", (0, 0), (-1, -1), 0.5, border_color),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EBF5FF")),
        ]))
        story.append(cost_table)
        story.append(Spacer(1, 8))

        # 5. Terms & Dynamic Scope
        if is_with_mat:
            material_term = "Material Supply: Full supply as per approved raw tube grade with Mill Test Certificates."
        else:
            material_term = "Material Scope: Labor/Job Work only. Client supplies raw tubes (+5% length for clamp collet & test cuts)."

        notes_line = f"<br/><b>Special Note:</b> {notes}" if notes else ""

        terms_html = f"""<b>COMMERCIAL TERMS & CONDITIONS:</b><br/>
1. <b>Delivery / Lead Time:</b> {lead_time} from confirmed PO & material receipt.<br/>
2. <b>Payment Terms:</b> {payment_terms}.<br/>
3. <b>Delivery Basis:</b> {delivery_terms}. Freight, in-transit insurance & special crating at actuals.<br/>
4. <b>Scope:</b> {material_term}<br/>
5. <b>Tolerances:</b> Bend angles &plusmn;0.5&deg;, leg lengths &plusmn;1.0mm per ISO 2768-m standards.<br/>
6. <b>Validity:</b> {validity} days from quote date.{notes_line}
"""
        sign_block = f"""<b>FOR {vendor_name.upper()}:</b><br/>
<font size="7" color="#64748B">Authorized Technical Signatory</font><br/><br/>
Sign: __________________________<br/><br/>
<b>ACCEPTED & CONFIRMED BY CLIENT:</b><br/>
Sign: __________________________<br/>
Date & Stamp: ___________________
"""
        footer_table = Table(
            [[Paragraph(terms_html, cell_style), Paragraph(sign_block, cell_style)]],
            colWidths=[4.3 * inch, 2.9 * inch]
        )
        footer_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), highlight_bg),
        ]))
        story.append(KeepTogether(footer_table))

        doc.build(story)
        return output_path
