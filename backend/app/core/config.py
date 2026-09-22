import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# In serverless environments like Vercel, the source tree is read-only.
# We use /tmp/storage to ensure writable directories and SQLite DB.
if os.environ.get("VERCEL") or not os.access(BASE_DIR, os.W_OK):
    STORAGE_DIR = Path("/tmp") / "storage"
else:
    STORAGE_DIR = BASE_DIR / "storage"

UPLOADS_DIR = STORAGE_DIR / "uploads"
QUOTES_DIR = STORAGE_DIR / "quotes"
SAMPLE_DIR = BASE_DIR / "sample_files"

try:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    QUOTES_DIR.mkdir(parents=True, exist_ok=True)
    if os.access(SAMPLE_DIR.parent, os.W_OK):
        SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

DATABASE_URL = f"sqlite+aiosqlite:///{STORAGE_DIR.as_posix()}/cnc_cpq.db"

APP_NAME = "Krishna Industrial Works CPQ"
COMPANY_NAME = "Krishna Industrial Works"
COMPANY_ADDRESS = "Gala No. B1, Jerom Chayya Marg, Kurla (W), Mumbai – 400070, Maharashtra"
COMPANY_PHONE = "+91 98765 43210"
COMPANY_EMAIL = "krishnaindustrialworks@gmail.com"
