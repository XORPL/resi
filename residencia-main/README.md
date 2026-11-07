# Plataforma de Firma Digital Híbrida (RSA-2048 + ML-DSA-87)

**Proyecto de Titulación / Residencia Profesional**  
*Tecnológico de Estudios Superiores de Jocotitlán (TESJo)*  
*División de Ingeniería en Sistemas Computacionales*

Plataforma de Firma Electrónica con Criptografía Post-Cuántica (ML-DSA-87) y RSA para Documentos Académicos.

---

## 📌 Descripción del Proyecto

Esta plataforma web implementa un esquema de **firma digital híbrida** para garantizar la autenticidad, integridad y no-repudio de documentos académicos y administrativos en formato PDF:
1. **Firma Digital Clásica**: RSA-2048 con esquema RSASSA-PSS y hash SHA-256.
2. **Firma Digital Post-Cuántica**: **ML-DSA-87** (*Module-Lattice Digital Signature Algorithm*, estandarizado por el NIST en **FIPS 204**, Categoría 5 de seguridad equivalente a AES-256).

### Características Principales
- **Custodia de Claves Segura (Key Vault)**: Cada usuario genera su par de claves una única vez. Las claves privadas se almacenan cifradas en base de datos usando **AES-256-GCM** con clave derivada del PIN personal del usuario mediante **PBKDF2HMAC (100,000 iteraciones SHA-256)**.
- **Gestión Documental Categorizada**: Clasificación de PDFs académicos (`Fotesjo 6`, `Fotesjo 4`, `Minutas`, `Plan de trabajo presidente`, `Tutorías`, `Fotesjo 111`, `Fotesjo 113`) con filtrado rápido, descarga del PDF original y constancia criptográfica `.txt`.
- **Verificación Matemática e Integridad Real**: En el apartado interno **Verificar**, el servidor descarga el PDF desde el almacenamiento, recalcula el hash SHA-256 binario en tiempo real y comprueba las firmas matemáticas RSA-2048 y ML-DSA-87.
- **Historial Dual (Actividad y Cargos Académicos)**: Bitácora de auditoría del sistema (limpiable por Jefe de División) y registro histórico de periodos de Cargos Académicos administrado por el Presidente de Academia.
- **Invitación de Usuarios por Correo y RBAC**: El Jefe de División invita nuevos usuarios indicando correo y rol (`jefe_division`, `presidente_academia`, `secretario_academia`, `docente`); el invitado recibe un enlace por correo para establecer su nombre completo y contraseña.

---

## 🛠️ Arquitectura del Sistema

```
residencia/
├── backend/                  # API REST en Python (FastAPI)
│   ├── app/
│   │   ├── main.py           # Entrypoint y configuración CORS
│   │   ├── config.py         # Variables de entorno
│   │   ├── db.py             # Clientes Supabase (JWT usuario y service_role admin)
│   │   ├── crypto/
│   │   │   ├── rsa_engine.py # Firma y verificación RSA-2048 / PSS SHA-256
│   │   │   ├── mldsa_engine.py# Firma y verificación ML-DSA-87 (FIPS 204)
│   │   │   └── key_vault.py  # Cifrado/Descifrado AES-256-GCM con PIN
│   │   ├── pdf/
│   │   │   └── hasher.py     # Cálculo de digest SHA-256 sobre binario real
│   │   ├── routers/          # Endpoints de llaves, firma, verificación y usuarios
│   │   └── schemas/          # Validadores Pydantic
│   ├── tests/                # Pruebas unitarias pytest
│   └── requirements.txt      # Librerías de Python
│
├── frontend/                 # Aplicación React 19 + Vite + Tailwind v4
│   ├── src/
│   │   ├── components/       # Header, Sidebar, KeyModal, SignModal
│   │   ├── context/          # AuthContext (Sesión estricta, invitación, rol y tema)
│   │   ├── lib/              # Supabase, API Backend, descargas y utilidades
│   │   └── pages/            # Login, CompleteInviteView, Dashboard, Documentos, Firmar, Verificar, Historial, Usuarios, Configuración
│   └── package.json
│
├── database/
│   └── schema.sql            # Tablas, triggers, funciones seguras y políticas RLS
│
└── venv/                     # Entorno virtual de Python
```

---

## 🚀 Guía de Instalación y Ejecución

### 1. Configuración de la Base de Datos (Supabase)

1. Ingrese al panel de su proyecto en **Supabase**.
2. Vaya a **SQL Editor** y ejecute el contenido completo de `database/schema.sql`.
3. En **Authentication → URL Configuration**, asegúrese de tener `http://localhost:5173` como **Site URL** (y en Redirect URLs) para los enlaces de invitación por correo.

---

### 2. Configuración y Ejecución del Backend (FastAPI)

#### A. Instalación de Dependencias
```powershell
.\venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

#### B. Variables de Entorno (`backend/.env`)
Cree el archivo `backend/.env` incluyendo `SUPABASE_SERVICE_ROLE_KEY` (necesaria para enviar correos de invitación con `invite_user_by_email`):
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=sb_publishable_tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tu_service_role_key
FRONTEND_URL=http://localhost:5173
```

#### C. Ejecutar Pruebas Unitarias Criptográficas
```powershell
.\venv\Scripts\pytest.exe -o pythonpath=backend backend/tests/test_crypto.py
```

#### D. Iniciar el Servidor Backend
```powershell
.\venv\Scripts\python.exe backend/run.py
```

---

### 3. Configuración y Ejecución del Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

---

## 📊 Métricas Académicas para Tesis

| Parámetro Criptográfico | RSA-2048 (Clásica) | ML-DSA-87 (Post-Cuántica FIPS 204) |
|---|---|---|
| **Resistencia a Ordenadores Cuánticos** | ❌ Vulnerable (Algoritmo de Shor) | ✅ Resistente (Module Lattice) |
| **Tamaño de Clave Pública** | 294 bytes (PEM) | 2,592 bytes (5,184 hex digits) |
| **Tamaño de Clave Privada** | 1,192 bytes (PEM) | 4,896 bytes (9,792 hex digits) |
| **Tamaño de Firma Digital** | 256 bytes (512 hex digits) | 4,627 bytes (9,254 hex digits) |
| **Estándar NIST / ISO** | PKCS#1 v1.5 / PSS | NIST FIPS 204 (Categoría 5) |
