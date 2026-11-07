import os
import sys

# Agregar el directorio backend al path para resolver los módulos `app.*` en Vercel Serverless
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402, F401

