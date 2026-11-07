"""
Pruebas unitarias para los motores criptográficos RSA-2048, ML-DSA-87, la Bóveda KeyVault y el enrutamiento FastAPI.
"""

import pytest
from app.crypto.rsa_engine import generate_rsa_keypair, sign_rsa_sha256, verify_rsa_sha256
from app.crypto.mldsa_engine import generate_mldsa_keypair, sign_mldsa87, verify_mldsa87
from app.crypto.key_vault import encrypt_private_keys, decrypt_private_keys


def test_rsa_lifecycle():
    pub_pem, priv_pem = generate_rsa_keypair()
    assert "BEGIN PUBLIC KEY" in pub_pem
    assert "BEGIN PRIVATE KEY" in priv_pem

    data = b"Documento de Prueba TESJo"
    signature_hex = sign_rsa_sha256(priv_pem, data)
    assert len(signature_hex) > 0

    # Verificar firma valida
    assert verify_rsa_sha256(pub_pem, data, signature_hex) is True

    # Verificar firma invalida con datos alterados
    assert verify_rsa_sha256(pub_pem, b"Documento Alterado", signature_hex) is False


def test_mldsa87_lifecycle():
    pub_hex, priv_hex = generate_mldsa_keypair()
    assert len(pub_hex) == 2592 * 2  # 5,184 caracteres hex
    assert len(priv_hex) == 4896 * 2  # 9,792 caracteres hex

    data = b"Hash SHA256 de PDF de Titulacion"
    signature_hex = sign_mldsa87(priv_hex, data)
    assert len(signature_hex) == 4627 * 2  # 9,254 caracteres hex

    # Verificar firma valida
    assert verify_mldsa87(pub_hex, data, signature_hex) is True

    # Verificar firma invalida con datos alterados
    assert verify_mldsa87(pub_hex, b"Hash Alterado", signature_hex) is False


def test_key_vault_encryption():
    rsa_pub, rsa_priv = generate_rsa_keypair()
    mldsa_pub, mldsa_priv = generate_mldsa_keypair()
    pin = "123456"

    encrypted = encrypt_private_keys(pin, rsa_priv, mldsa_priv)
    assert len(encrypted["encrypted_rsa_private"]) > 0
    assert len(encrypted["salt_hex"]) == 32
    assert len(encrypted["nonce_hex"]) == 24
    assert len(encrypted["tag_hex"]) == 32

    # Descifrado correcto
    dec_rsa, dec_mldsa = decrypt_private_keys(
        pin,
        encrypted["encrypted_rsa_private"],
        encrypted["salt_hex"],
        encrypted["nonce_hex"],
        encrypted["tag_hex"],
    )
    assert dec_rsa == rsa_priv
    assert dec_mldsa == mldsa_priv

    # Descifrado fallido con PIN incorrecto
    with pytest.raises(ValueError):
        decrypt_private_keys(
            "654321",
            encrypted["encrypted_rsa_private"],
            encrypted["salt_hex"],
            encrypted["nonce_hex"],
            encrypted["tag_hex"],
        )


def test_fastapi_routes_registered():
    from app.main import app

    paths = set(app.openapi()["paths"].keys())
    assert "/api/keys/generate" in paths
    assert "/api/sign/document" in paths
    assert "/api/verify/{document_id}" in paths
    assert "/api/users/invite" in paths
    assert "/api/users/{user_id}" in paths
    assert "/api/verify/file" not in paths
