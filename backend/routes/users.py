# backend/routes/users.py (New File)
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import database_handler, auth

router = APIRouter()

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: str
    username: str

@router.put("/profile")
async def update_own_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    db_user = database_handler.get_user_by_username(current_user.get("sub"))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user_id = db_user.get("id")
    
    success = database_handler.update_user_profile(user_id, profile_data.full_name, profile_data.username)
    if not success:
        raise HTTPException(status_code=400, detail="Username may already be taken.")

    # After updating, fetch the updated user details and create a NEW token
    updated_user = database_handler.get_user_by_username(profile_data.username)
    
    token_data = {
        "sub": updated_user["username"], 
        "role": updated_user["role"], 
        "dept": updated_user.get("department"),
        "fullName": updated_user["full_name"]
    }
    access_token = auth.create_access_token(data=token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": updated_user["username"],
            "fullName": updated_user["full_name"],
            "role": updated_user["role"],
            "department": updated_user.get("department")
        }
    }

@router.put("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: dict = Depends(auth.get_current_user)
):
    db_user = database_handler.get_user_by_username(current_user.get("sub"))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not auth.verify_password(request.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    new_password_hash = auth.get_password_hash(request.new_password)
    success = database_handler.change_user_password(db_user["id"], new_password_hash)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")

    return {"status": "success", "message": "Password changed successfully."}