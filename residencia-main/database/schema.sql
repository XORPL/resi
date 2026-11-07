-- ========================================================
-- ESQUEMA DE BASE DE DATOS Y POLÍTICAS RLS EN SUPABASE
-- Proyecto: Plataforma de Firma Digital Híbrida (RSA-2048 + ML-DSA-87)
-- Institución: Tecnológico de Estudios Superiores de Jocotitlán (TESJo)
-- ========================================================

-- Habilitar extensión UUID / pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. TABLA DE PERFILES DE USUARIOS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('jefe_division', 'presidente_academia', 'secretario_academia', 'docente')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    setup_completed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migraciones seguras en caso de que la tabla ya existiera previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- ========================================================
-- 2. TABLA DE BÓVEDA DE LLAVES CRIPTOGRÁFICAS POR USUARIO
-- La llave privada está cifrada con AES-256-GCM derivado del PIN del usuario usando PBKDF2.
-- ========================================================
CREATE TABLE IF NOT EXISTS public.user_keys (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    rsa_public_pem TEXT NOT NULL,
    mldsa_public_hex TEXT NOT NULL,
    encrypted_rsa_private TEXT NOT NULL,
    encrypted_mldsa_private TEXT NOT NULL,
    salt_hex TEXT NOT NULL,
    nonce_hex TEXT NOT NULL,
    tag_hex TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 3. TABLA DE DOCUMENTOS PDF Y REGISTROS DE FIRMA
-- ========================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Fotesjo 6' CHECK (
        category IN (
            'Fotesjo 6',
            'Fotesjo 4',
            'Minutas',
            'Plan de trabajo presidente',
            'Tutorías',
            'Fotesjo 111',
            'Fotesjo 113'
        )
    ),
    size BIGINT NOT NULL,
    original_storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_by_name TEXT NOT NULL,
    signed_by TEXT,
    signed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    doc_hash TEXT,
    rsa_signature TEXT,
    mldsa_signature TEXT,
    rsa_public_pem TEXT,
    mldsa_public_hex TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migraciones seguras sobre documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Fotesjo 6';
ALTER TABLE public.documents DROP COLUMN IF EXISTS signed_storage_path;

-- ========================================================
-- 4. TABLA DE HISTORIAL DE ACTIVIDAD / AUDITORÍA
-- ========================================================
CREATE TABLE IF NOT EXISTS public.history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 5. TABLA DE HISTORIAL DE CARGOS ACADÉMICOS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.academy_office_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_type TEXT NOT NULL CHECK (office_type IN ('presidente_academia', 'secretario_academia', 'jefe_division')),
    office_name TEXT NOT NULL,
    year_start INTEGER NOT NULL CHECK (year_start >= 1900 AND year_start <= 2200),
    year_end INTEGER NOT NULL CHECK (year_end >= year_start AND year_end <= 2200),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- FUNCIONES AUXILIARES DE SEGURIDAD (EVITAN RECURSIÓN EN RLS)
-- ========================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid() AND active = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND active = TRUE
    );
$$;

-- ========================================================
-- TRIGGER PARA CREAR PERFIL AUTOMÁTICO AL REGISTRAR / INVITAR EN SUPABASE AUTH
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
BEGIN
    base_username := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
        split_part(NEW.email, '@', 1)
    );

    final_username := base_username;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id <> NEW.id) THEN
        final_username := base_username || '_' || substr(NEW.id::text, 1, 6);
    END IF;

    INSERT INTO public.profiles (id, email, username, full_name, role, active, setup_completed)
    VALUES (
        NEW.id,
        NEW.email,
        final_username,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
        CASE
            WHEN NEW.raw_user_meta_data->>'role' IN ('jefe_division', 'presidente_academia', 'secretario_academia', 'docente')
                THEN NEW.raw_user_meta_data->>'role'
            ELSE 'docente'
        END,
        TRUE,
        COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, TRUE)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- POLÍTICAS DE SEGURIDAD NIVEL DE FILA (RLS - ROW LEVEL SECURITY)
-- ========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_office_history ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas para permitir re-ejecución limpia
DROP POLICY IF EXISTS "Lectura pública de perfiles activos" ON public.profiles;
DROP POLICY IF EXISTS "Lectura de perfiles para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Actualización de perfil propio o por jefe de división" ON public.profiles;
DROP POLICY IF EXISTS "Creación de perfiles para usuarios autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Inserción de perfiles por usuario o jefe de división" ON public.profiles;
DROP POLICY IF EXISTS "Eliminación de perfiles solo por jefe de división" ON public.profiles;

DROP POLICY IF EXISTS "Lectura pública de llaves (necesario para verificación de firmas)" ON public.user_keys;
DROP POLICY IF EXISTS "Lectura de llaves para autenticados" ON public.user_keys;
DROP POLICY IF EXISTS "Lectura exclusiva de bóveda propia" ON public.user_keys;
DROP POLICY IF EXISTS "Los usuarios solo pueden insertar sus propias llaves" ON public.user_keys;
DROP POLICY IF EXISTS "Los usuarios solo pueden actualizar sus propias llaves" ON public.user_keys;

DROP POLICY IF EXISTS "Lectura de documentos para usuarios autenticados o verificación pública de firmados" ON public.documents;
DROP POLICY IF EXISTS "Lectura de documentos para usuarios activos" ON public.documents;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON public.documents;
DROP POLICY IF EXISTS "Usuarios activos pueden subir documentos" ON public.documents;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON public.documents;
DROP POLICY IF EXISTS "Usuarios activos pueden actualizar documentos" ON public.documents;
DROP POLICY IF EXISTS "Solo directivos pueden eliminar documentos" ON public.documents;
DROP POLICY IF EXISTS "Solo jefe de división puede eliminar documentos" ON public.documents;

DROP POLICY IF EXISTS "Lectura de historial para autenticados" ON public.history;
DROP POLICY IF EXISTS "Inserción de eventos de historial para autenticados" ON public.history;
DROP POLICY IF EXISTS "Solo jefe de división puede limpiar historial" ON public.history;

DROP POLICY IF EXISTS "Lectura de cargos académicos para autenticados" ON public.academy_office_history;
DROP POLICY IF EXISTS "Solo presidente de academia puede insertar cargos" ON public.academy_office_history;
DROP POLICY IF EXISTS "Solo presidente de academia puede actualizar cargos" ON public.academy_office_history;
DROP POLICY IF EXISTS "Solo presidente de academia puede eliminar cargos" ON public.academy_office_history;

-- 1. Políticas para PROFILES
CREATE POLICY "Lectura de perfiles para autenticados"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Inserción de perfiles por usuario o jefe de división"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.get_my_role() = 'jefe_division');

CREATE POLICY "Actualización de perfil propio o por jefe de división"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.get_my_role() = 'jefe_division')
    WITH CHECK (
        public.get_my_role() = 'jefe_division'
        OR (
            auth.uid() = id
            AND role = public.get_my_role()
            AND active = public.is_active_user()
        )
    );

CREATE POLICY "Eliminación de perfiles solo por jefe de división"
    ON public.profiles FOR DELETE
    USING (public.get_my_role() = 'jefe_division' AND id <> auth.uid());

-- 2. Políticas para USER_KEYS (aislamiento estricto de bóveda cifrada por propietario)
CREATE POLICY "Lectura exclusiva de bóveda propia"
    ON public.user_keys FOR SELECT
    USING (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY "Los usuarios solo pueden insertar sus propias llaves"
    ON public.user_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY "Los usuarios solo pueden actualizar sus propias llaves"
    ON public.user_keys FOR UPDATE
    USING (auth.uid() = user_id AND public.is_active_user());

-- 3. Políticas para DOCUMENTS
CREATE POLICY "Lectura de documentos para usuarios activos"
    ON public.documents FOR SELECT
    USING (
        public.is_active_user()
        AND (
            public.get_my_role() IN ('jefe_division', 'presidente_academia', 'secretario_academia')
            OR uploaded_by = auth.uid()
            OR status = 'signed'
        )
    );

CREATE POLICY "Usuarios activos pueden subir documentos"
    ON public.documents FOR INSERT
    WITH CHECK (public.is_active_user() AND uploaded_by = auth.uid());

CREATE POLICY "Usuarios activos pueden actualizar documentos"
    ON public.documents FOR UPDATE
    USING (public.is_active_user());

CREATE POLICY "Solo jefe de división puede eliminar documentos"
    ON public.documents FOR DELETE
    USING (public.get_my_role() = 'jefe_division');

-- 4. Políticas para HISTORY
CREATE POLICY "Lectura de historial para autenticados"
    ON public.history FOR SELECT
    USING (public.is_active_user());

CREATE POLICY "Inserción de eventos de historial para autenticados"
    ON public.history FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo jefe de división puede limpiar historial"
    ON public.history FOR DELETE
    USING (public.get_my_role() = 'jefe_division');

-- 5. Políticas para ACADEMY_OFFICE_HISTORY (Cargos académicos)
CREATE POLICY "Lectura de cargos académicos para autenticados"
    ON public.academy_office_history FOR SELECT
    USING (public.is_active_user());

CREATE POLICY "Solo presidente de academia puede insertar cargos"
    ON public.academy_office_history FOR INSERT
    WITH CHECK (public.get_my_role() = 'presidente_academia');

CREATE POLICY "Solo presidente de academia puede actualizar cargos"
    ON public.academy_office_history FOR UPDATE
    USING (public.get_my_role() = 'presidente_academia')
    WITH CHECK (public.get_my_role() = 'presidente_academia');

CREATE POLICY "Solo presidente de academia puede eliminar cargos"
    ON public.academy_office_history FOR DELETE
    USING (public.get_my_role() = 'presidente_academia');

-- ========================================================
-- BUCKET Y POLÍTICAS EN SUPABASE STORAGE
-- ========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Usuarios activos leen archivos de documents" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios activos suben archivos a documents" ON storage.objects;
DROP POLICY IF EXISTS "Jefe de división elimina archivos de documents" ON storage.objects;

CREATE POLICY "Usuarios activos leen archivos de documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND public.is_active_user());

CREATE POLICY "Usuarios activos suben archivos a documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND public.is_active_user());

CREATE POLICY "Jefe de división elimina archivos de documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND public.get_my_role() = 'jefe_division');
