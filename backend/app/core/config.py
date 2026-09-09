from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
QUOTES_DIR = STORAGE_DIR / "quotes"
SAMPLE_DIR = BASE_DIR / "sample_files"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
QUOTES_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{STORAGE_DIR}/cnc_cpq.db"

APP_NAME = "Automated CNC Tube Bending CPQ"
COMPANY_NAME = "Precision Tube & Bending Co."
COMPANY_ADDRESS = "1040 Industrial Parkway, Suite 400, Chicago, IL 60607"
COMPANY_PHONE = "+1 (800) 555-TUBE"
COMPANY_EMAIL = "quotes@precisionbending.com"
