from pydantic import BaseModel, Field
from typing import Literal, Optional

RoleType = Literal["jefe_division", "presidente_academia", "secretario_academia", "docente"]


class KeyGenerationRequest(BaseModel):
    user_id: str
    pin: str = Field(..., min_length=6, description="PIN personal de 6+ caracteres para cifrar la clave privada")


class KeyStatusResponse(BaseModel):
    has_keys: bool
    rsa_public_pem: Optional[str] = None
    mldsa_public_hex: Optional[str] = None
    created_at: Optional[str] = None


class SignDocumentRequest(BaseModel):
    document_id: str
    user_id: str
    pin: str = Field(..., min_length=6)


class SignDocumentResponse(BaseModel):
    success: bool
    message: str
    doc_hash: str
    rsa_signature: str
    mldsa_signature: str


class VerifyResponse(BaseModel):
    is_valid: bool
    document_name: Optional[str] = None
    signed_by: Optional[str] = None
    signer_role: Optional[str] = None
    signed_at: Optional[str] = None
    hash_matches: bool
    rsa_valid: bool
    mldsa_valid: bool
    doc_hash: Optional[str] = None
    rsa_signature: Optional[str] = None
    mldsa_signature: Optional[str] = None
    message: str


class InviteUserRequest(BaseModel):
    email: str = Field(..., min_length=5, description="Correo electrónico institucional o personal del invitado")
    role: RoleType


class InviteUserResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
