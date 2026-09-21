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

DATABASE_URL = f"sqlite+aiosqlite:///{STORAGE_DIR.as_posix()}/cnc_cpq.db"

APP_NAME = "Krishna Industrial Works CPQ"
COMPANY_NAME = "Krishna Industrial Works"
COMPANY_ADDRESS = "Gala No. B1, Jerom Chayya Marg, Kurla (W), Mumbai – 400070, Maharashtra"
COMPANY_PHONE = "+91 98765 43210"
COMPANY_EMAIL = "krishnaindustrialworks@gmail.com"
