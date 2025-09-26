# backend/routes/principal.py (Final, Complete Version)
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from .. import database_handler
from .. import auth

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models for Data Validation ---
class HodCreate(BaseModel):
    username: str
    password: str
    full_name: str
    department: str

class HodResponse(BaseModel):
    id: int
    username: str
    full_name: str
    department: str

class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str

# --- Endpoints ---

@router.post("/hods", response_model=HodResponse)
async def create_hod(
    hod_data: HodCreate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    """Principal creates a new Head of Department."""
    if database_handler.get_user_by_username(hod_data.username):
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    new_user = database_handler.create_user(
        username=hod_data.username, password=hod_data.password,
        full_name=hod_data.full_name, role='hod',
        department=hod_data.department.upper()
    )
    if not new_user:
        raise HTTPException(status_code=500, detail="Failed to create HOD account.")
    return new_user

@router.get("/hods", response_model=List[HodResponse])
async def get_all_hods(current_user: dict = Depends(auth.require_role(['principal']))):
    """Principal gets a list of all HODs."""
    return database_handler.get_users_by_role('hod')

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    """Principal creates a new department."""
    new_dept = database_handler.create_department(dept_data.name, dept_data.code.upper())
    if not new_dept:
        raise HTTPException(status_code=400, detail="Department code already exists.")
    return new_dept

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_all_departments(current_user: dict = Depends(auth.require_role(['principal']))):
    """Principal gets a list of all departments."""
    return database_handler.get_all_departments()