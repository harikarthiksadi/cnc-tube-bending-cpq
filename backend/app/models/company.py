from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.models.rate_master import Base

class CompanyProfile(Base):
    """
    Company Profile & Branding Settings.
    Controls the vendor company name, address, contact, GSTIN, and default terms
    across the entire CPQ application and generated quotations/PDFs.
    """
    __tablename__ = "company_profile"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, default="Precision Tube & Bending Works")
    tagline = Column(String, default="CNC Rotary Draw Bending & Precision Metal Fabrication")
    address = Column(String, default="Plot 42, Phase II, Industrial Area, Sector 58")
    city_state_zip = Column(String, default="Bangalore, Karnataka 560058, India")
    phone = Column(String, default="+91 (800) 555-TUBE / +91 98765 43210")
    email = Column(String, default="quotes@precisionbending.com")
    gstin = Column(String, default="29AAACK1234M1Z5")
    website = Column(String, default="www.precisionbending.com")
    bank_name = Column(String, default="HDFC Bank")
    account_no = Column(String, default="50200012345678")
    ifsc_code = Column(String, default="HDFC0001234")
    default_lead_time = Column(String, default="5 – 7 Business Days")
    default_payment_terms = Column(String, default="50% Advance with PO, Balance before dispatch")
    default_validity_days = Column(Integer, default=30)
    default_delivery_terms = Column(String, default="Ex-Works Factory")
    default_terms_and_conditions = Column(
        Text,
        default=(
            "1. Validity: 30 days from quote date.\n"
            "2. Delivery: 5-7 business days from receipt of confirmed PO & raw material.\n"
            "3. Payment Terms: 50% advance along with purchase order, balance against proforma before dispatch.\n"
            "4. Freight & Packaging: Ex-Works our facility. Transport & special packaging charged at actuals.\n"
            "5. Tolerances: Bend angles ±0.5°, straight leg lengths ±1.0mm per ISO 2768-m.\n"
            "6. Material: Customer supplied raw tube must be free from rust, severe seams, or excessive ovality."
        )
    )
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
