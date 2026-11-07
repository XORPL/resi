"""
Modulo de Hashing de Documentos PDF.
Calcula el digest SHA-256 sobre el binario real del archivo PDF para garantizar integridad estricta.
"""

import hashlib

def compute_pdf_sha256(pdf_bytes: bytes) -> str:
    """
    Calcula el hash SHA-256 (cadena hexadecimal de 64 caracteres) sobre el contenido binario del PDF.
    """
    hasher = hashlib.sha256()
    hasher.update(pdf_bytes)
    return hasher.hexdigest().lower()
