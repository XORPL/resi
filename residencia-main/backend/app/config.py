import os
from pathlib import Path
from dotenv import load_dotenv

# En desarrollo local carga backend/.env; en Vercel usa las variables cifradas del entorno
BACKEND_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
if BACKEND_ENV_PATH.exists():
    load_dotenv(dotenv_path=BACKEND_ENV_PATH)
else:
    load_dotenv()


def _normalize_supabase_url(raw_url: str) -> str:
    url = (raw_url or "").strip().rstrip("/")
    if url.endswith("/rest/v1"):
        url = url[: -len("/rest/v1")].rstrip("/")
    return url


IS_PRODUCTION = bool(
    os.getenv("VERCEL") == "1"
    or os.getenv("VERCEL_ENV") == "production"
    or os.getenv("APP_ENV", "").lower() == "production"
)

SUPABASE_URL = _normalize_supabase_url(os.getenv("SUPABASE_URL", ""))
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def _resolve_frontend_url() -> str:
    explicit = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    vercel_prod = os.getenv("VERCEL_PROJECT_PRODUCTION_URL", "").strip().rstrip("/")
    if vercel_prod:
        return f"https://{vercel_prod}"
    vercel_preview = os.getenv("VERCEL_URL", "").strip().rstrip("/")
    if vercel_preview:
        return f"https://{vercel_preview}"
    return "http://localhost:5173"


FRONTEND_URL = _resolve_frontend_url()

ALLOWED_ORIGINS = []
for candidate in (
    FRONTEND_URL,
    f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL', '').strip()}" if os.getenv("VERCEL_PROJECT_PRODUCTION_URL") else "",
    f"https://{os.getenv('VERCEL_URL', '').strip()}" if os.getenv("VERCEL_URL") else "",
    "http://localhost:5173" if not IS_PRODUCTION else "",
    "http://127.0.0.1:5173" if not IS_PRODUCTION else "",
):
    cleaned = candidate.strip().rstrip("/")
    if cleaned and cleaned not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(cleaned)
