from typing import Optional
from fastapi import HTTPException, status
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY


def _ensure_supabase_configured() -> None:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración incompleta del servidor: faltan SUPABASE_URL o SUPABASE_ANON_KEY.",
        )


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
        return parts[1].strip()
    return None


def get_supabase_client(authorization: Optional[str] = None) -> Client:
    """
    Retorna un cliente de Supabase.
    Si SUPABASE_SERVICE_ROLE_KEY está configurada se usa para operaciones internas del backend
    (previa validación explícita del JWT del usuario en los endpoints);
    de lo contrario reenvía el JWT del usuario autenticado para cumplir con las políticas RLS.
    """
    _ensure_supabase_configured()
    if SUPABASE_SERVICE_ROLE_KEY:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    token = extract_bearer_token(authorization)
    if token:
        client.options.headers["Authorization"] = f"Bearer {token}"
    return client


def get_supabase_admin() -> Client:
    """
    Retorna un cliente administrativo de Supabase con privilegios service_role
    (requerido exclusivamente en servidor para auth.admin.invite_user_by_email y delete_user).
    """
    _ensure_supabase_configured()
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor "
                "para gestionar invitaciones y bajas en Supabase Auth."
            ),
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_authenticated_profile(authorization: Optional[str]) -> Optional[dict]:
    """
    Valida criptográficamente el JWT Bearer contra Supabase Auth y obtiene el perfil del usuario.
    """
    _ensure_supabase_configured()
    token = extract_bearer_token(authorization)
    if not token:
        return None

    try:
        auth_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_res = auth_client.auth.get_user(token)
        if not user_res or not user_res.user:
            return None

        db = get_supabase_client(authorization)
        prof_res = db.table("profiles").select("*").eq("id", user_res.user.id).execute()
        if prof_res.data:
            return prof_res.data[0]
    except Exception:
        return None
    return None


def require_active_user(authorization: Optional[str]) -> dict:
    """
    Exige un JWT válido de Supabase Auth y que el usuario tenga cuenta activa en profiles.
    """
    profile = get_authenticated_profile(authorization)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada. Inicia sesión nuevamente.",
        )
    if not profile.get("active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: tu cuenta no se encuentra activa.",
        )
    return profile


def require_jefe_division(authorization: Optional[str]) -> dict:
    """
    Verifica que la petición provenga de un usuario autenticado, activo y con rol jefe_division.
    """
    profile = require_active_user(authorization)
    if profile.get("role") != "jefe_division":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: solo el Jefe de División puede realizar esta acción.",
        )
    return profile
