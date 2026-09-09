from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class TubeRateMaster(Base):
    """
    Exact Rate Master table from Company Sheet (Image 1):
    Shape | Size | Thickness (mm) | Material | Bending Rate / Pc | Cutting Rate / Pc
    """
    __tablename__ = "rate_master_tubes"

    id = Column(Integer, primary_key=True, index=True)
    shape = Column(String, index=True)  # "Round", "Square", "Rectangular"
    size = Column(String, index=True)   # "1/2\"", "3/4\"", "1\"", "25x25", "40x20", etc.
    thickness_mm = Column(Float, default=1.5)  # 1.5, 1.2
    material = Column(String, default="SS")    # "SS", "MS"
    bending_rate_per_pc = Column(Float, nullable=False)  # ₹ Bending Rate per bend
    cutting_rate_per_pc = Column(Float, nullable=False)  # ₹ Cutting Rate per cut
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SetupChargeMaster(Base):
    __tablename__ = "rate_master_setup"

    id = Column(Integer, primary_key=True, index=True)
    machine_type = Column(String, unique=True, index=True)
    base_setting_charge = Column(Float, nullable=False)  # e.g. ₹500.0, ₹200.0
    hourly_rate = Column(Float, default=500.0)
    setup_hours = Column(Float, default=1.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ToolingDie(Base):
    __tablename__ = "tooling_dies"

    id = Column(Integer, primary_key=True, index=True)
    tube_od_mm = Column(Float, nullable=False)
    tube_shape = Column(String, default="Round")
    clr_mm = Column(Float, nullable=False)  # Centerline Radius
    is_standard_stock = Column(Boolean, default=True)
    mandrel_available = Column(Boolean, default=True)
    custom_tooling_charge = Column(Float, default=5000.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
