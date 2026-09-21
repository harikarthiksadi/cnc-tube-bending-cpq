from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from datetime import datetime
from app.models.rate_master import Base

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String, unique=True, index=True)
    customer_name = Column(String, default="Valued Customer")
    customer_company = Column(String, default="Client Dynamics Corp")
    customer_email = Column(String, default="procurement@client.com")
    customer_phone = Column(String, default="")
    customer_gstin = Column(String, default="")
    part_name = Column(String, default="Custom Formed Tube Assembly")

    # Vendor / Issuing Company Snapshot
    vendor_company_name = Column(String, default="Precision Tube & Bending Works")
    vendor_gstin = Column(String, default="29AAACK1234M1Z5")

    # Commercial Terms
    validity_days = Column(Integer, default=30)
    lead_time = Column(String, default="5 – 7 Business Days")
    payment_terms = Column(String, default="50% Advance with PO, Balance before dispatch")
    delivery_terms = Column(String, default="Ex-Works Factory")
    notes = Column(Text, default="")

    # Order parameters
    quantity = Column(Integer, nullable=False, default=100)
    tube_shape = Column(String, default="Round")
    tube_od_mm = Column(Float, nullable=False)
    wall_thickness_mm = Column(Float, nullable=False)
    material_code = Column(String, nullable=False)
    material_mode = Column(String, default="making_cost_only")

    # CAD geometry detected
    detected_bends = Column(Integer, default=0)
    flattened_length_mm = Column(Float, default=0.0)

    # Pricing calculation values
    labor_cost_per_piece = Column(Float, default=0.0)
    material_cost_per_piece = Column(Float, default=0.0)
    base_setting_charge = Column(Float, default=0.0)
    custom_setting_charge = Column(Float, nullable=True)
    calculated_rate_per_piece = Column(Float, default=0.0)
    manual_rate_per_piece = Column(Float, nullable=True)  # sales rep manual override
    total_job_cost = Column(Float, default=0.0)
    gst_type = Column(String, default="intra_state")
    gst_rate_pct = Column(Float, default=18.0)
    gst_amount = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    rate_per_piece_incl_tax = Column(Float, default=0.0)

    # Secondary operations & status
    secondary_ops = Column(Text, default="[]")  # JSON string of selected operations
    status = Column(String, default="Draft")  # Draft, Sent, Approved, Rejected

    # Snapshots & file paths
    rate_snapshot = Column(Text, default="{}")  # JSON string
    cad_geometry_snapshot = Column(Text, default="{}")  # JSON string
    cad_file_path = Column(String, nullable=True)
    pdf_file_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
