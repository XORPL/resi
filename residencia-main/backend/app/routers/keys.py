from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.db import get_supabase_client, require_active_user
from app.schemas.schemas import KeyGenerationRequest, KeyStatusResponse
from app.crypto.rsa_engine import generate_rsa_keypair
from app.crypto.mldsa_engine import generate_mldsa_keypair
from app.crypto.key_vault import encrypt_private_keys

router = APIRouter(prefix="/api/keys", tags=["Llaves Criptográficas"])


@router.post("/generate", response_model=KeyStatusResponse)
async def generate_user_keys(
    req: KeyGenerationRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Genera un nuevo par de llaves RSA-2048 y ML-DSA-87 para el usuario autenticado.
    Cifra las llaves privadas con AES-256-GCM derivado de su PIN personal.
    """
    caller = require_active_user(authorization)
    if caller["id"] != req.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para generar llaves en nombre de otro usuario.",
        )

    supabase = get_supabase_client(authorization)

    existing = supabase.table("user_keys").select("user_id").eq("user_id", req.user_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya posee un par de llaves generadas. Para regenerar, contacte al administrador.",
        )

    try:
        rsa_pub, rsa_priv = generate_rsa_keypair()
        mldsa_pub, mldsa_priv = generate_mldsa_keypair()

        vault_data = encrypt_private_keys(req.pin, rsa_priv, mldsa_priv)

        db_payload = {
            "user_id": req.user_id,
            "rsa_public_pem": rsa_pub,
            "mldsa_public_hex": mldsa_pub,
            "encrypted_rsa_private": vault_data["encrypted_rsa_private"],
            "encrypted_mldsa_private": vault_data["encrypted_mldsa_private"],
            "salt_hex": vault_data["salt_hex"],
            "nonce_hex": vault_data["nonce_hex"],
            "tag_hex": vault_data["tag_hex"],
        }

        res = supabase.table("user_keys").insert(db_payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Error al guardar las llaves en la base de datos.")

        return KeyStatusResponse(
            has_keys=True,
            rsa_public_pem=rsa_pub,
            mldsa_public_hex=mldsa_pub,
            created_at=res.data[0].get("created_at"),
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error interno durante la generación de llaves criptográficas.")


@router.get("/status/{user_id}", response_model=KeyStatusResponse)
async def get_keys_status(
    user_id: str,
    authorization: Optional[str] = Header(default=None),
):
    """
    Consulta si el usuario autenticado tiene llaves asociadas y devuelve únicamente sus llaves públicas.
    """
    caller = require_active_user(authorization)
    if caller["id"] != user_id and caller.get("role") != "jefe_division":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para consultar el estado de llaves de otro usuario.",
        )

    supabase = get_supabase_client(authorization)
    res = supabase.table("user_keys").select("rsa_public_pem, mldsa_public_hex, created_at").eq("user_id", user_id).execute()

    if not res.data or len(res.data) == 0:
        return KeyStatusResponse(has_keys=False)

    row = res.data[0]
    return KeyStatusResponse(
        has_keys=True,
        rsa_public_pem=row["rsa_public_pem"],
        mldsa_public_hex=row["mldsa_public_hex"],
        created_at=row["created_at"],
    )
