"""
Modulo de Bóveda de Claves Cifradas por PIN (Key Vault).
Protege las claves privadas RSA y ML-DSA-87 en reposo utilizando AES-256-GCM
con clave derivada mediante PBKDF2HMAC (SHA-256, 100,000 iteraciones) del PIN del usuario.
"""

import os
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def derive_key(pin: str, salt: bytes) -> bytes:
    """
    Deriva una clave simetrica de 256 bits (32 bytes) a partir del PIN usando PBKDF2.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(pin.encode('utf-8'))

def encrypt_private_keys(pin: str, rsa_private_pem: str, mldsa_private_hex: str) -> dict:
    """
    Cifra las llaves privadas RSA y ML-DSA-87 usando el PIN del usuario.
    Retorna un diccionario con los datos codificados en HEX:
    {
        'encrypted_rsa_private': hex,
        'encrypted_mldsa_private': hex,
        'salt_hex': hex,
        'nonce_hex': hex,
        'tag_hex': hex
    }
    """
    salt = os.urandom(16)
    key = derive_key(pin, salt)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    
    # Concatenar las llaves en un paquete JSON o separador seguro
    payload = f"{rsa_private_pem}::MLDSA_SEP::{mldsa_private_hex}".encode('utf-8')
    ciphertext_and_tag = aesgcm.encrypt(nonce, payload, None)
    
    # Separar ciphertext y tag (los ultimos 16 bytes son la etiqueta de autenticacion)
    ciphertext = ciphertext_and_tag[:-16]
    tag = ciphertext_and_tag[-16:]
    
    return {
        "encrypted_rsa_private": ciphertext.hex(),
        "encrypted_mldsa_private": "", # Ambas estan dentro del paquete cifrado unico
        "salt_hex": salt.hex(),
        "nonce_hex": nonce.hex(),
        "tag_hex": tag.hex()
    }

def decrypt_private_keys(pin: str, encrypted_rsa_hex: str, salt_hex: str, nonce_hex: str, tag_hex: str) -> tuple[str, str]:
    """
    Descifra las llaves privadas RSA y ML-DSA-87 proporcionando el PIN correcto.
    Lanza ValueError si el PIN es incorrecto o la etiqueta de autenticación no coincide.
    Retorna (rsa_private_pem, mldsa_private_hex).
    """
    try:
        salt = bytes.fromhex(salt_hex)
        nonce = bytes.fromhex(nonce_hex)
        tag = bytes.fromhex(tag_hex)
        ciphertext = bytes.fromhex(encrypted_rsa_hex)
        
        key = derive_key(pin, salt)
        aesgcm = AESGCM(key)
        
        ciphertext_and_tag = ciphertext + tag
        decrypted_payload = aesgcm.decrypt(nonce, ciphertext_and_tag, None).decode('utf-8')
        
        rsa_pem, mldsa_hex = decrypted_payload.split("::MLDSA_SEP::")
        return rsa_pem, mldsa_hex
    except Exception as e:
        raise ValueError("PIN incorrecto o clave alterada. Descifrado fallido.") from e
