import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.db import get_supabase_client, require_active_user
from app.schemas.schemas import SignDocumentRequest, SignDocumentResponse
from app.crypto.key_vault import decrypt_private_keys
from app.crypto.rsa_engine import sign_rsa_sha256
from app.crypto.mldsa_engine import sign_mldsa87
from app.pdf.hasher import compute_pdf_sha256

router = APIRouter(prefix="/api/sign", tags=["Firma Digital"])


@router.post("/document", response_model=SignDocumentResponse)
async def sign_document(
    req: SignDocumentRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Ejecuta el proceso de firma digital híbrida (RSA-2048 + ML-DSA-87) sobre el documento PDF original:
    1. Verifica la sesión JWT y propiedad de la identidad del firmante.
    2. Descifra las llaves privadas del usuario con su PIN.
    3. Descarga el PDF original desde Supabase Storage y valida cabecera PDF.
    4. Calcula el hash SHA-256 binario real del documento.
    5. Firma el hash con RSA-2048 (RSASSA-PSS) y ML-DSA-87 (FIPS 204).
    6. Registra las firmas y llaves públicas en la base de datos e historial.
    """
    caller = require_active_user(authorization)
    if caller["id"] != req.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes firmar documentos en nombre de otro usuario.",
        )

    supabase = get_supabase_client(authorization)

    doc_res = supabase.table("documents").select("*").eq("id", req.document_id).execute()
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    doc_data = doc_res.data[0]

    if caller.get("role") == "docente" and doc_data.get("uploaded_by") != caller["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: un docente únicamente puede firmar sus propios documentos.",
        )

    if doc_data.get("status") == "signed":
        raise HTTPException(status_code=400, detail="El documento ya ha sido firmado previamente.")

    key_res = supabase.table("user_keys").select("*").eq("user_id", caller["id"]).execute()
    if not key_res.data:
        raise HTTPException(
            status_code=400,
            detail="El usuario no ha generado sus llaves criptográficas. Por favor genérelas primero.",
        )
    key_row = key_res.data[0]
    signer_name = caller["full_name"]

    try:
        rsa_priv_pem, mldsa_priv_hex = decrypt_private_keys(
            pin=req.pin,
            encrypted_rsa_hex=key_row["encrypted_rsa_private"],
            salt_hex=key_row["salt_hex"],
            nonce_hex=key_row["nonce_hex"],
            tag_hex=key_row["tag_hex"],
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    try:
        pdf_bytes = supabase.storage.from_("documents").download(doc_data["original_storage_path"])
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo descargar el archivo PDF desde el almacenamiento seguro.")

    if not pdf_bytes or len(pdf_bytes) < 5 or pdf_bytes[:5] != b"%PDF-":
        raise HTTPException(status_code=400, detail="El archivo almacenado no es un documento PDF válido.")

    doc_hash = compute_pdf_sha256(pdf_bytes)
    hash_bytes = bytes.fromhex(doc_hash)

    rsa_sig_hex = sign_rsa_sha256(rsa_priv_pem, hash_bytes)
    mldsa_sig_hex = sign_mldsa87(mldsa_priv_hex, hash_bytes)

    signed_at_now = datetime.datetime.now(datetime.timezone.utc)

    db_update = {
        "status": "signed",
        "signed_by": signer_name,
        "signed_by_user_id": caller["id"],
        "doc_hash": doc_hash,
        "rsa_signature": rsa_sig_hex,
        "mldsa_signature": mldsa_sig_hex,
        "rsa_public_pem": key_row["rsa_public_pem"],
        "mldsa_public_hex": key_row["mldsa_public_hex"],
        "signed_at": signed_at_now.isoformat(),
    }

    supabase.table("documents").update(db_update).eq("id", req.document_id).execute()

    supabase.table("history").insert({
        "type": "sign",
        "title": "Documento firmado",
        "description": f'"{doc_data["name"]}" firmado con RSA-2048 + ML-DSA-87.',
        "user_name": signer_name,
        "user_id": caller["id"],
    }).execute()

    return SignDocumentResponse(
        success=True,
        message="Documento firmado e inmutablemente registrado con éxito.",
        doc_hash=doc_hash,
        rsa_signature=rsa_sig_hex,
        mldsa_signature=mldsa_sig_hex,
    )
