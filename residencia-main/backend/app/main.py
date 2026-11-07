from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS, IS_PRODUCTION
from app.routers import keys, sign, verify, users

# En producción se deshabilitan /docs, /redoc y /openapi.json para no exponer la superficie de la API
app = FastAPI(
    title="FirmaDigital API - TESJo",
    description="API REST de Firma Digital Híbrida (RSA-2048 + ML-DSA-87 / FIPS 204)",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(keys.router)
app.include_router(sign.router)
app.include_router(verify.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Plataforma de Firma Digital Híbrida (RSA-2048 + ML-DSA-87)",
        "institution": "Tecnológico de Estudios Superiores de Jocotitlán (TESJo)",
        "version": "1.0.0",
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
