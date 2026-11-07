"""
Modulo Criptografico Clásico: RSA-2048 con RSASSA-PSS y SHA-256.
Proporciona funciones para generacion de claves, firma de hashes binarios y verificacion.
"""

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
import base64

def generate_rsa_keypair() -> tuple[str, str]:
    """
    Genera un par de claves RSA-2048.
    Retorna (public_key_pem, private_key_pem).
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return public_pem, private_pem

def sign_rsa_sha256(private_key_pem: str, data_bytes: bytes) -> str:
    """
    Firma datos binarios o hash binario con la clave privada RSA usando RSASSA-PSS SHA-256.
    Retorna la firma codificada en HEX.
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    
    signature = private_key.sign(
        data_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return signature.hex()

def verify_rsa_sha256(public_key_pem: str, data_bytes: bytes, signature_hex: str) -> bool:
    """
    Verifica una firma RSA codificada en HEX contra los datos binarios.
    """
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        signature_bytes = bytes.fromhex(signature_hex)
        
        public_key.verify(
            signature_bytes,
            data_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception as e:
        return False
