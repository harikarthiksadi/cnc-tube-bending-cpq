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
    part_name = Column(String, default="Custom Formed Tube Assembly")

    # Order parameters
    quantity = Column(Integer, nullable=False, default=100)
    tube_shape = Column(String, default="Round")
    tube_od_mm = Column(Float, nullable=False)
    wall_thickness_mm = Column(Float, nullable=False)
    material_code = Column(String, nullable=False)

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

    # Secondary operations & status
    secondary_ops = Column(Text, default="[]")  # JSON string of selected operations
    status = Column(String, default="Draft")  # Draft, Sent, Approved, Rejected

    # Snapshots & file paths
    rate_snapshot = Column(Text, default="{}")  # JSON string
    cad_geometry_snapshot = Column(Text, default="{}")  # JSON string
    cad_file_path = Column(String, nullable=True)
    pdf_file_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
