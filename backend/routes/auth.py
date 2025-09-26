# backend/routes/auth.py (Final, Complete Version)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .. import database_handler
from .. import auth

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(request: LoginRequest):
    user = database_handler.get_user_by_username(request.username)
    
    if not user or not auth.verify_password(request.password, user['password_hash']):
        raise HTTPException(
            status_code=401, 
            detail="Incorrect username or password"
        )
    
    access_token = auth.create_access_token(
        data={"sub": user["username"], "role": user["role"], "dept": user.get("department")}
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "fullName": user["full_name"],
            "role": user["role"],
            "department": user.get("department")
        }
    }