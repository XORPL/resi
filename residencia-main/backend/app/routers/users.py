from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from app.config import FRONTEND_URL, SUPABASE_SERVICE_ROLE_KEY
from app.db import get_supabase_admin, get_supabase_client, require_jefe_division
from app.schemas.schemas import InviteUserRequest, InviteUserResponse

router = APIRouter(prefix="/api/users", tags=["Administración de Usuarios"])

ROLE_LABELS = {
    "jefe_division": "Jefe de División",
    "presidente_academia": "Presidente de Academia",
    "secretario_academia": "Secretario de Academia",
    "docente": "Docente",
}


@router.post("/invite", response_model=InviteUserResponse)
async def invite_new_user(
    req: InviteUserRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Exclusivo para Jefe de División.
    Envía un correo oficial de invitación de Supabase Auth al nuevo usuario asignándole su rol.
    Al aceptar el correo, el usuario completará su nombre completo y contraseña.
    """
    caller = require_jefe_division(authorization)
    email = req.email.strip().lower()

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ingresa un correo electrónico válido.",
        )

    admin = get_supabase_admin()

    # Verificar si ya existe un perfil con ese correo
    existing = admin.table("profiles").select("id, email").eq("email", email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado o invitado con ese correo electrónico.",
        )

    base_username = email.split("@")[0]

    try:
        invite_res = admin.auth.admin.invite_user_by_email(
            email,
            options={
                "data": {
                    "role": req.role,
                    "username": base_username,
                    "full_name": "Invitación pendiente",
                    "setup_completed": False,
                },
                "redirect_to": FRONTEND_URL,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo enviar la invitación por correo: {str(e)}",
        )

    invited_user = invite_res.user
    if not invited_user:
        raise HTTPException(status_code=500, detail="Supabase no devolvió el usuario invitado.")

    # Garantizar username único y perfil inicial pendiente de completar nombre/contraseña
    safe_username = base_username
    clash = (
        admin.table("profiles")
        .select("id")
        .eq("username", safe_username)
        .neq("id", invited_user.id)
        .execute()
    )
    if clash.data:
        safe_username = f"{base_username}_{invited_user.id[:6]}"

    admin.table("profiles").upsert({
        "id": invited_user.id,
        "email": email,
        "username": safe_username,
        "full_name": "Invitación pendiente",
        "role": req.role,
        "active": True,
        "setup_completed": False,
    }).execute()

    admin.table("history").insert({
        "type": "user",
        "title": "Invitación de usuario enviada",
        "description": f"Se envió invitación a {email} con el rol {ROLE_LABELS.get(req.role, req.role)}.",
        "user_name": caller["full_name"],
        "user_id": caller["id"],
    }).execute()

    return InviteUserResponse(
        success=True,
        message=f"Invitación enviada a {email}. El usuario deberá aceptar el correo para definir su nombre y contraseña.",
        user_id=invited_user.id,
    )


@router.delete("/{user_id}")
async def delete_user_account(
    user_id: str,
    authorization: Optional[str] = Header(default=None),
):
    """
    Exclusivo para Jefe de División.
    Elimina al usuario de auth.users (si SUPABASE_SERVICE_ROLE_KEY está configurada) y de profiles.
    """
    caller = require_jefe_division(authorization)
    if user_id == caller["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta.")

    db = get_supabase_client(authorization)
    target_res = db.table("profiles").select("full_name, email, username").eq("id", user_id).execute()
    target_label = (
        target_res.data[0].get("full_name") or target_res.data[0].get("email") or user_id
        if target_res.data
        else user_id
    )

    try:
        if SUPABASE_SERVICE_ROLE_KEY:
            admin = get_supabase_admin()
            admin.auth.admin.delete_user(user_id)
            admin.table("profiles").delete().eq("id", user_id).execute()
        else:
            db.table("profiles").delete().eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el usuario: {str(e)}")

    try:
        db.table("history").insert({
            "type": "delete",
            "title": "Usuario eliminado",
            "description": f'Se eliminó la cuenta de "{target_label}".',
            "user_name": caller["full_name"],
            "user_id": caller["id"],
        }).execute()
    except Exception:
        pass

    return {"success": True, "message": "Usuario eliminado correctamente."}

