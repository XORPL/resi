from typing import Optional
from fastapi import APIRouter, Header
from app.db import get_supabase_client, require_active_user
from app.schemas.schemas import VerifyResponse
from app.crypto.rsa_engine import verify_rsa_sha256
from app.crypto.mldsa_engine import verify_mldsa87
from app.pdf.hasher import compute_pdf_sha256

router = APIRouter(prefix="/api/verify", tags=["Verificación de Firmas"])

ROLE_LABELS = {
    "jefe_division": "Jefe de División",
    "presidente_academia": "Presidente de Academia",
    "secretario_academia": "Secretario de Academia",
    "docente": "Docente",
}


async def _verify_document_by_id(document_id: str, authorization: Optional[str]) -> VerifyResponse:
    verifier_profile = require_active_user(authorization)
    supabase = get_supabase_client(authorization)

    res = supabase.table("documents").select("*").eq("id", document_id).execute()
    if not res.data:
        return VerifyResponse(
            is_valid=False,
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="El documento consultado no existe en el registro del sistema.",
        )

    doc = res.data[0]
    if doc.get("status") != "signed":
        return VerifyResponse(
            is_valid=False,
            document_name=doc.get("name"),
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="El documento registrado aún no ha sido firmado.",
        )

    doc_hash = doc.get("doc_hash")
    rsa_sig = doc.get("rsa_signature")
    mldsa_sig = doc.get("mldsa_signature")
    rsa_pub = doc.get("rsa_public_pem")
    mldsa_pub = doc.get("mldsa_public_hex")
    storage_path = doc.get("original_storage_path")

    if not all([doc_hash, rsa_sig, mldsa_sig, rsa_pub, mldsa_pub, storage_path]):
        return VerifyResponse(
            is_valid=False,
            document_name=doc.get("name"),
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="Datos de firma o almacenamiento incompletos o corruptos.",
        )

    try:
        pdf_bytes = supabase.storage.from_("documents").download(storage_path)
    except Exception:
        return VerifyResponse(
            is_valid=False,
            document_name=doc.get("name"),
            hash_matches=False,
            rsa_valid=False,
            mldsa_valid=False,
            message="No se pudo descargar el PDF almacenado para verificar su integridad.",
        )

    actual_hash = compute_pdf_sha256(pdf_bytes)
    hash_matches = actual_hash == doc_hash
    hash_bytes = bytes.fromhex(actual_hash)

    rsa_valid = verify_rsa_sha256(rsa_pub, hash_bytes, rsa_sig)
    mldsa_valid = verify_mldsa87(mldsa_pub, hash_bytes, mldsa_sig)
    is_valid = hash_matches and rsa_valid and mldsa_valid

    role_name = "Docente"
    if doc.get("signed_by_user_id"):
        prof_res = supabase.table("profiles").select("role").eq("id", doc["signed_by_user_id"]).execute()
        if prof_res.data:
            raw_role = prof_res.data[0]["role"]
            role_name = ROLE_LABELS.get(raw_role, raw_role)

    try:
        supabase.table("history").insert({
            "type": "verify",
            "title": f"Verificación {'exitosa' if is_valid else 'fallida'}",
            "description": (
                f'"{doc["name"]}" verificado. Hash coincide: {"Sí" if hash_matches else "No"}, '
                f'RSA-2048: {"Válida" if rsa_valid else "Inválida"}, '
                f'ML-DSA-87: {"Válida" if mldsa_valid else "Inválida"}.'
            ),
            "user_name": verifier_profile["full_name"],
            "user_id": verifier_profile["id"],
        }).execute()
    except Exception:
        pass

    return VerifyResponse(
        is_valid=is_valid,
        document_name=doc.get("name"),
        signed_by=doc.get("signed_by"),
        signer_role=role_name,
        signed_at=doc.get("signed_at"),
        hash_matches=hash_matches,
        rsa_valid=rsa_valid,
        mldsa_valid=mldsa_valid,
        doc_hash=doc_hash,
        rsa_signature=rsa_sig,
        mldsa_signature=mldsa_sig,
        message=(
            "Verificación exitosa: El hash binario SHA-256 del archivo coincide y las firmas RSA-2048 y ML-DSA-87 son matemáticamente válidas."
            if is_valid
            else "Verificación fallida: El documento fue alterado o alguna de las firmas criptográficas no es válida."
        ),
    )


@router.get("/{document_id}", response_model=VerifyResponse)
async def verify_document(
    document_id: str,
    authorization: Optional[str] = Header(default=None),
):
    return await _verify_document_by_id(document_id, authorization)


@router.get("/folio/{document_id}", response_model=VerifyResponse)
async def verify_by_folio(
    document_id: str,
    authorization: Optional[str] = Header(default=None),
):
    return await _verify_document_by_id(document_id, authorization)
