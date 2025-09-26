# backend/main.py (Corrected and Final)
import os
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from . import database_handler

# Import all route modules
from .routes import attendance, registration, management, auth, principal, hod, staff

# Initialize the database on startup
database_handler.initialize_database()

app = FastAPI(title="Project Netra - Final API")

origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers with appropriate prefixes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(principal.router, prefix="/api/principal", tags=["Principal Actions"])
app.include_router(hod.router, prefix="/api/hod", tags=["HOD Actions"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff Actions"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(registration.router, prefix="/api/registration", tags=["Registration"])
app.include_router(management.router, prefix="/api/management", tags=["General Management"])


@app.get("/")
def read_root():
    """A simple health check endpoint."""
    return {"status": "Backend is running."}