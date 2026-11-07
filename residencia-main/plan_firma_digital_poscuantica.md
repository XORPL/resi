# Plan de Implementación: Plataforma de Firma Digital Híbrida (RSA-256 + ML-DSA-87)

Proyecto de Titulación / Residencia Profesional — Tecnológico de Estudios Superiores de Jocotitlán (TESJo).

---

## 1. Goal Description

Desarrollar y desplegar una plataforma web profesional para la gestión y firma digital de documentos académicos y administrativos en formato PDF. La plataforma implementa un esquema **híbrido de firma**:
1. **Firma Clásica**: RSA-2048 / RSASSA-PSS con SHA-256.
2. **Firma Post-Cuántica**: **ML-DSA-87** (FIPS 204 / Categoría 5 de NIST, resistente a ataques cuánticos mediante el algoritmo de Shor).

### Arquitectura de Tres Capas
- **Frontend (Cliente Web)**: React 18+ estructurado con Vite, Tailwind CSS y componentes ejecutivos accesibles para roles académicos (`jefe_division`, `presidente_academia`, `secretario_academia`, `docente`).
- **Backend Criptográfico (API REST)**: Python con FastAPI, encargado del cálculo de hashes binarios reales sobre PDFs, generación y validación de claves RSA-2048 y ML-DSA-87 (usando `dilithium-py` / `cryptography`), cifrado de llaves privadas mediante PBKDF2/AES-GCM con PIN de usuario, y generación de la hoja de firmas institucional anexa al PDF con código QR y metadatos (`reportlab` + `pypdf`).
- **Persistencia y Servicios (BaaS)**: Supabase (PostgreSQL relacional, Autenticación JWT con perfiles y Storage S3-compatible para PDFs originales y firmados).

---

## 2. User Review Required

> [!IMPORTANT]
> **Decisiones acordadas durante la sesión de alineación:**
> 1. **Stack Tecnológico**: Frontend en **React + Vite** + Backend en **Python (FastAPI)** + **Supabase**.
> 2. **Modelo de Claves**: Cada usuario genera su par de claves RSA y ML-DSA-87 una única vez. La clave privada se guarda cifrada en base de datos con AES-GCM derivado del PIN personal del docente. Para firmar, el docente ingresa su PIN. La clave pública queda registrada en su perfil para verificación abierta.
> 3. **Salida del Documento Firmado**: Se estampa una **Hoja Institucional de Firmas** al final del PDF con el desglose de firmas (RSA y ML-DSA-87), hash SHA-256 del documento original y un código QR que enlaza a la validación pública.
> 4. **Flujo de Firmantes**: Firma individual por documento (1 firmante por archivo cargado).
> 5. **Portal de Verificación Pública**: Disponible sin inicio de sesión, permitiendo validar por Código QR / Folio o arrastrando el archivo PDF para validar integridad en tiempo real.

> [!TIP]
> **Valor Académico para la Tesis**:
> Esta arquitectura proporciona métricas comparativas directas para tu documento de titulación:
> - Tiempo de generación de llaves (RSA vs ML-DSA-87).
> - Tamaño de llaves y firmas (RSA: 256 bytes vs ML-DSA-87: 4,627 bytes).
> - Tiempo de firmado y verificación.

---

## 3. Open Questions

Ninguna bloqueante en este momento. Todas las decisiones estructurales fueron resueltas durante el proceso `/grill-me`. Se contemplará soporte configurable para el entorno de desarrollo local (puertos: Vite en `http://localhost:5173`, FastAPI en `http://localhost:8000`).

---

## 4. Proposed Changes

La estructura del proyecto se organizará en una raíz modular y limpia:

```
residencia/
├── backend/                  # API REST en Python (FastAPI)
│   ├── app/
│   │   ├── main.py           # Entrypoint y configuración CORS
│   │   ├── config.py         # Variables de entorno (Supabase credentials)
│   │   ├── crypto/
│   │   │   ├── rsa_engine.py      # Generación, firma y verificación RSA-2048
│   │   │   ├── mldsa_engine.py    # Generación, firma y verificación ML-DSA-87 (FIPS 204)
│   │   │   └── key_vault.py       # Cifrado/Descifrado de claves privadas con PIN (AES-GCM)
│   │   ├── pdf/
│   │   │   ├── hasher.py          # Cálculo de hash SHA-256 sobre binario real
│   │   │   └── stamper.py         # Generador de Hoja de Firmas con QR (ReportLab + PyPDF)
│   │   ├── routers/
│   │   │   ├── keys.py            # Endpoints: /api/keys/generate, /api/keys/status
│   │   │   ├── sign.py            # Endpoint: /api/sign/document
│   │   │   └── verify.py          # Endpoints: /api/verify/public/{folio}, /api/verify/file
│   │   └── schemas/               # Modelos Pydantic de entrada/salida
│   ├── requirements.txt      # fastapi, uvicorn, cryptography, dilithium-py, pypdf, reportlab, qrcode, supabase
│   └── run.py                # Script de inicio del servidor backend
│
├── frontend/                 # Aplicación React + Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx           # Enrutamiento (Login, Dashboard, Verificador Público)
│   │   ├── index.css         # Tokens de diseño moderno y Tailwind/CSS
│   │   ├── lib/
│   │   │   ├── supabase.js   # Cliente Supabase
│   │   │   └── api.js        # Cliente HTTP hacia FastAPI backend
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Estado de sesión, usuario, rol y claves
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar con roles y header institucional
│   │   │   ├── KeyModal.jsx  # Modal para inicializar/generar llaves con PIN
│   │   │   ├── SignModal.jsx # Modal para firmar documento solicitando PIN
│   │   │   └── StatCards.jsx # Indicadores visuales de documentos
│   │   └── pages/
│   │       ├── Dashboard.jsx # Inicio y estadísticas
│   │       ├── Documents.jsx # Carga de PDFs y lista de pendientes
│   │       ├── SignView.jsx  # Bandeja de documentos para firmar
│   │       ├── UsersView.jsx # Gestión de roles (Directivos/Academia)
│   │       └── VerifyPublic.jsx # Portal público de verificación por QR o PDF
│
├── database/                 # Scripts SQL para Supabase
│   └── schema.sql            # Tablas (profiles, documents, user_keys, audit_log) y políticas RLS
│
└── residencia.html           # Prototipo original conservado como referencia
```

---

### Componente 1: Base de Datos Supabase (`database/schema.sql`)
#### [NEW] `database/schema.sql`
- Tablas:
  - `profiles`: `id` (FK auth.users), `username`, `full_name`, `role`, `created_at`.
  - `user_keys`: `user_id`, `rsa_public_pem`, `mldsa_public_hex`, `encrypted_rsa_private`, `encrypted_mldsa_private`, `salt`, `created_at`.
  - `documents`: `id`, `name`, `size`, `original_storage_path`, `signed_storage_path`, `status` (`pending`, `signed`), `uploaded_by`, `signed_by`, `doc_hash`, `rsa_signature`, `mldsa_signature`, `signed_at`.
  - `audit_log`: `id`, `user_id`, `action`, `details`, `ip_address`, `created_at`.
- Políticas RLS seguras para permitir lectura de claves públicas para validación y restringir claves privadas únicamente a su dueño.

---

### Componente 2: Backend Criptográfico en Python (FastAPI)
#### [NEW] `backend/requirements.txt`
```text
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
cryptography>=42.0.0
dilithium-py>=1.4.0
pypdf>=4.0.0
reportlab>=4.1.0
qrcode[pil]>=7.4.2
supabase>=2.3.0
python-dotenv>=1.0.0
```

#### [NEW] `backend/app/crypto/mldsa_engine.py`
- Utiliza `dilithium_py.ml_dsa.MLDSA87` (FIPS 204).
- `generate_keypair() -> tuple[bytes, bytes]`: Genera clave pública (2592 bytes) y clave secreta (4896 bytes).
- `sign(secret_key_bytes: bytes, message_bytes: bytes) -> bytes`: Genera firma ML-DSA-87 (4627 bytes).
- `verify(public_key_bytes: bytes, message_bytes: bytes, signature_bytes: bytes) -> bool`: Valida matemáticamente la firma post-cuántica.

#### [NEW] `backend/app/crypto/rsa_engine.py`
- Utiliza `cryptography.hazmat.primitives.asymmetric.rsa` con exponente 65537, longitud 2048 bits.
- Firma con `PSS` (Probabilistic Signature Scheme) y digest `SHA256`.
- Exportación e importación en formato estándar PEM (PKCS#8 y X.509 SubjectPublicKeyInfo).

#### [NEW] `backend/app/crypto/key_vault.py`
- Cifrado seguro de las llaves privadas con el PIN del usuario usando `PBKDF2HMAC(SHA256, 100_000 iteraciones)` + `AES-GCM (256-bit)`.
- La clave privada nunca se guarda en texto plano ni se expone al cliente; solo se descifra en memoria efímera durante la firma.

#### [NEW] `backend/app/pdf/stamper.py`
- Genera una página de cierre con membrete del TESJo, tabla formal de datos, resumen criptográfico con tipografía monoespaciada legible, y genera dinámicamente un código QR apuntando al endpoint de verificación `/verify?folio={document_id}`.
- Fusiona la página generada al final del PDF original mediante `pypdf.PdfWriter`.

#### [NEW] `backend/app/routers/sign.py` y `verify.py`
- `POST /api/sign/document`: Recibe `document_id` y `user_pin` (con token JWT de Supabase), recupera el PDF de Supabase Storage, computa hash binario, firma con RSA y ML-DSA-87, estampa la hoja con QR, sube el PDF firmado a Storage y actualiza el registro en la base de datos.
- `GET /api/verify/folio/{doc_id}`: Retorna el estado del documento, datos del firmante, hash registrado y validez de ambas firmas.
- `POST /api/verify/file`: Recibe un PDF subido por cualquier visitante, calcula su hash binario y busca coincidencias en la base de datos, validando ambas firmas.

---

### Componente 3: Frontend Moderno (React + Vite)
#### [NEW] `frontend/package.json`
- React 18, Vite, Lucide Icons, Tailwind CSS, `@supabase/supabase-js`.

#### [NEW] `frontend/src/pages/Dashboard.jsx` y `Documents.jsx`
- Interfaz atractiva y profesional con estadísticas en tiempo real (documentos totales, pendientes, firmados).
- Zona interactiva Drag-and-Drop para cargar archivos PDF con cálculo previo de tamaño.

#### [NEW] `frontend/src/components/KeyModal.jsx` y `SignModal.jsx`
- Si el usuario no tiene llaves registradas, un asistente guiado le solicita definir un PIN de 6 dígitos para generar su par de llaves RSA y ML-DSA-87.
- Al firmar, solicita el PIN, muestra una animación de progreso criptográfico paso a paso y al concluir permite descargar inmediatamente el PDF oficial firmado con su hoja y QR.

#### [NEW] `frontend/src/pages/VerifyPublic.jsx`
- Vista pública accesible sin necesidad de autenticarse.
- Permite pegar el folio o subir cualquier PDF para verificar al instante su autenticidad e integridad.

---

## 5. Verification Plan

### Automated Tests
1. **Pruebas Unitarias del Motor Criptográfico**:
   ```powershell
   cd backend
   python -m pytest tests/test_crypto.py
   ```
   - Validará:
     - Generación de claves ML-DSA-87 (tamaños exactos de llaves).
     - Firma y verificación exitosa de datos arbitrarios con ML-DSA-87.
     - Detección de firmas corruptas (debe fallar la verificación si se altera 1 solo byte).
     - Generación, firma y verificación RSA-2048 con PSS.
     - Cifrado y descifrado de llaves con PIN correcto e incorrecto.

2. **Prueba de Estampado de PDF y Código QR**:
   ```powershell
   python tests/test_pdf_stamping.py
   ```
   - Generará un PDF de prueba firmado y comprobará que la página anexa y el QR sean legibles.

### Manual Verification
1. **Flujo de Usuario y Generación de Llaves**:
   - Iniciar sesión con un usuario docente.
   - Generar llaves con un PIN elegido (ej. `123456`). Verificar en Supabase que las llaves públicas están legibles y las privadas están cifradas.
2. **Subida y Firma de Documento**:
   - Subir un PDF de prueba de 1 o más páginas.
   - Presionar "Firmar", ingresar el PIN.
   - Descargar el PDF resultante y verificar:
     - Contiene todas las páginas originales intactas.
     - Contiene la última página institucional con el membrete, firmas RSA y ML-DSA-87, y el QR.
3. **Validación Pública**:
   - Abrir una ventana de incógnito en el navegador e ir a `/verificar`.
   - Escanear el QR con un teléfono o subir el PDF firmado.
   - Confirmar que la pantalla muestra: "✅ DOCUMENTO AUTÉNTICO - Firma RSA Válida - Firma ML-DSA-87 Válida".
   - Modificar intencionalmente un byte del PDF y verificar que el sistema marque: "❌ DOCUMENTO ALTERADO O NO REGISTRADO".
