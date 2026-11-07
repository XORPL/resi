"""
Modulo Criptografico Post-Cuántico: ML-DSA-87 (FIPS 204 / NIST Categoria 5).
Proporciona funciones para generacion de claves, firma de hashes binarios y verificacion.
"""

from dilithium_py.ml_dsa import ML_DSA_87

def generate_mldsa_keypair() -> tuple[str, str]:
    """
    Genera un par de claves ML-DSA-87.
    Retorna (mldsa_public_hex, mldsa_private_hex).
    - Public key: 2,592 bytes (5,184 caracteres hex)
    - Secret key: 4,896 bytes (9,792 caracteres hex)
    """
    pk_bytes, sk_bytes = ML_DSA_87.keygen()
    return pk_bytes.hex(), sk_bytes.hex()

def sign_mldsa87(secret_key_hex: str, data_bytes: bytes) -> str:
    """
    Firma datos binarios con la clave privada ML-DSA-87.
    Retorna la firma codificada en HEX (4,627 bytes / 9,254 caracteres hex).
    """
    sk_bytes = bytes.fromhex(secret_key_hex)
    signature_bytes = ML_DSA_87.sign(sk_bytes, data_bytes)
    return signature_bytes.hex()

def verify_mldsa87(public_key_hex: str, data_bytes: bytes, signature_hex: str) -> bool:
    """
    Verifica una firma ML-DSA-87 codificada en HEX contra los datos binarios.
    """
    try:
        pk_bytes = bytes.fromhex(public_key_hex)
        sig_bytes = bytes.fromhex(signature_hex)
        return ML_DSA_87.verify(pk_bytes, data_bytes, sig_bytes)
    except Exception as e:
        return False
