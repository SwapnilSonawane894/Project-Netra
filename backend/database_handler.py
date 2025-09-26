# backend/database_handler.py (Final, Complete, and Corrected)
import sqlite3
import pickle
import json
import os
from datetime import date, datetime

# Import auth module ONLY to use its hashing function from the parent directory
from . import auth 

DB_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
DB_FILE = os.path.join(DB_FOLDER, "project_netra_final.db")
os.makedirs(DB_FOLDER, exist_ok=True)

# In backend/database_handler.py

def initialize_database():
    """Creates all tables ONCE. This should only be called from main.py on startup."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL, role TEXT NOT NULL, department TEXT
        )''')
    # Departments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL
        )''')
        
    # --- THIS IS THE CRITICAL FIX ---
    # The 'subjects' table was completely missing.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            abbreviation TEXT NOT NULL, -- New column
            department TEXT NOT NULL,
            UNIQUE(name, department),
            UNIQUE(abbreviation, department)
        )''')
        
    # The 'staff_subjects' table for linking teachers to subjects
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff_subjects (
            staff_id INTEGER,
            subject_id INTEGER,
            FOREIGN KEY (staff_id) REFERENCES users (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            PRIMARY KEY (staff_id, subject_id)
        )''')

    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            roll_no TEXT PRIMARY KEY, name TEXT NOT NULL, student_class TEXT NOT NULL,
            parent_phone_number TEXT, department TEXT, arcface_embedding BLOB NOT NULL
        )''')
    # Timetable table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timetable (id INTEGER PRIMARY KEY, schedule TEXT NOT NULL)''')
    # Attendance records table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, roll_no TEXT NOT NULL, name TEXT NOT NULL,
            attendance_date TEXT NOT NULL, subject TEXT NOT NULL, teacher TEXT NOT NULL,
            hall TEXT NOT NULL, time_slot TEXT NOT NULL, timestamp TEXT NOT NULL,
            UNIQUE(roll_no, attendance_date, subject, time_slot)
        )''')
    
    # Seed a default Principal user ONLY if the users table is empty
    cursor.execute("SELECT COUNT(id) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
                       ('principal', auth.get_password_hash('principal123'), 'Principal User', 'principal'))
    conn.commit()
    conn.close()
    print("Database initialized successfully.")
def get_user_by_username(username: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, full_name, role, department FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if not row: return None
    return {"id": row[0], "username": row[1], "password_hash": row[2], "full_name": row[3], "role": row[4], "department": row[5]}

def create_user(username, password, full_name, role, department=None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        hashed_password = auth.get_password_hash(password)
        cursor.execute("INSERT INTO users (username, password_hash, full_name, role, department) VALUES (?, ?, ?, ?, ?)",
                       (username, hashed_password, full_name, role, department))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return {"id": user_id, "username": username, "full_name": full_name, "role": role, "department": department}
    except sqlite3.IntegrityError:
        conn.close()
        return None

def get_users_by_role(role: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, department FROM users WHERE role = ? ORDER BY full_name", (role,))
    users = [{"id": row[0], "username": row[1], "full_name": row[2], "department": row[3]} for row in cursor.fetchall()]
    conn.close()
    return users

# --- DEPARTMENT MANAGEMENT ---

def create_department(name: str, code: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO departments (name, code) VALUES (?, ?)", (name, code))
        conn.commit()
        dept_id = cursor.lastrowid
        conn.close()
        return {"id": dept_id, "name": name, "code": code}
    except sqlite3.IntegrityError:
        conn.close()
        return None

def get_all_departments():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, code FROM departments ORDER BY name")
        depts = [{"id": row[0], "name": row[1], "code": row[2]} for row in cursor.fetchall()]
        conn.close()
        return depts
    except sqlite3.OperationalError:
        return []

# --- STUDENT MANAGEMENT ---

def recreate_students_table():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS students")
    conn.commit()
    conn.close()
    initialize_database()

def add_student(roll_no, name, student_class, embedding, parent_phone_number=None, department=None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    serialized_embedding = pickle.dumps(embedding)
    cursor.execute("REPLACE INTO students (roll_no, name, student_class, parent_phone_number, department, arcface_embedding) VALUES (?, ?, ?, ?, ?, ?)",
                   (roll_no, name, student_class, parent_phone_number, department, serialized_embedding))
    conn.commit()
    conn.close()

def get_all_student_data():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT roll_no, name, arcface_embedding FROM students")
        rows = cursor.fetchall()
        conn.close()
        return {row[0]: {"name": row[1], "arcface_embedding": pickle.loads(row[2])} for row in rows}
    except sqlite3.OperationalError:
        return {}

def get_all_students_for_management():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT roll_no, name, student_class, department FROM students ORDER BY roll_no")
        rows = cursor.fetchall()
        conn.close()
        return [{"roll_no": row[0], "name": row[1], "student_class": row[2], "department": row[3]} for row in rows]
    except sqlite3.OperationalError:
        return []

def delete_student(roll_no: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE roll_no = ?", (roll_no,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

# --- ATTENDANCE & TIMETABLE ---

def record_attendance(roll_no, name, lecture_details):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    today = date.today().isoformat()
    now_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT OR IGNORE INTO attendance_records 
        (roll_no, name, attendance_date, subject, teacher, hall, time_slot, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        roll_no, name, today,
        lecture_details.get('subject', 'N/A'), lecture_details.get('teacher', 'N/A'),
        lecture_details.get('hall', 'N/A'), lecture_details.get('time', 'N/A'),
        now_timestamp
    ))
    conn.commit()
    conn.close()

def get_attendance_records(filter_date=None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    query_date = filter_date if filter_date else date.today().isoformat()
    cursor.execute("SELECT * FROM attendance_records WHERE attendance_date = ? ORDER BY timestamp DESC", (query_date,))
    rows = cursor.fetchall()
    records = [{"id": r[0], "roll_no": r[1], "name": r[2], "date": r[3], "subject": r[4], "teacher": r[5], "hall": r[6], "time_slot": r[7], "timestamp": r[8]} for r in rows]
    conn.close()
    return records

def get_absent_students_for_lecture(filter_date, subject, time_slot):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT roll_no FROM students")
    all_students = {row[0] for row in cursor.fetchall()}
    cursor.execute("SELECT DISTINCT roll_no FROM attendance_records WHERE attendance_date = ? AND subject = ? AND time_slot = ?", (filter_date, subject, time_slot))
    present_students = {row[0] for row in cursor.fetchall()}
    absent_roll_nos = all_students - present_students
    if not absent_roll_nos:
        conn.close()
        return []
    placeholders = ','.join('?' for _ in absent_roll_nos)
    query = f"SELECT roll_no, name, student_class, parent_phone_number FROM students WHERE roll_no IN ({placeholders})"
    cursor.execute(query, tuple(absent_roll_nos))
    absentee_details = [{"roll_no": r[0], "name": r[1], "student_class": r[2], "parent_phone": r[3]} for r in cursor.fetchall()]
    conn.close()
    return absentee_details

def save_timetable(schedule_data: dict):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    schedule_json = json.dumps(schedule_data)
    cursor.execute("REPLACE INTO timetable (id, schedule) VALUES (1, ?)", (schedule_json,))
    conn.commit()
    conn.close()

def get_timetable():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT schedule FROM timetable WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        return json.loads(row[0]) if row else None
    except sqlite3.OperationalError:
        conn.close()
        return None
    
def create_subject(name: str, abbreviation: str, department: str):
    """Creates a new subject for a specific department."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # --- FIX: Ensure abbreviation is included in the insert ---
        cursor.execute("INSERT INTO subjects (name, abbreviation, department) VALUES (?, ?, ?)", 
                       (name, abbreviation, department))
        conn.commit()
        subject_id = cursor.lastrowid
        conn.close()
        return {"id": subject_id, "name": name, "abbreviation": abbreviation, "department": department}
    except sqlite3.IntegrityError:
        conn.close()
        return None

def get_subjects_by_department(department: str):
    """Fetches all subjects for a specific department."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # --- FIX: Select the 'abbreviation' column from the database ---
    cursor.execute("SELECT id, name, abbreviation, department FROM subjects WHERE department = ? ORDER BY name", (department,))
    subjects = [{"id": row[0], "name": row[1], "abbreviation": row[2], "department": row[3]} for row in cursor.fetchall()]
    conn.close()
    return subjects

def assign_subjects_to_staff(staff_id: int, subject_ids: list[int]):
    """Assigns a list of subjects to a staff member."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    for subject_id in subject_ids:
        cursor.execute("INSERT OR IGNORE INTO staff_subjects (staff_id, subject_id) VALUES (?, ?)", (staff_id, subject_id))
    conn.commit()
    conn.close()

def get_users_by_role_and_department(roles: list[str], department: str):
    """Fetches all users with specific roles within a department."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    placeholders = ','.join('?' for _ in roles)
    query = f"SELECT id, username, full_name, department FROM users WHERE role IN ({placeholders}) AND department = ? ORDER BY full_name"
    cursor.execute(query, (*roles, department))
    users = [{"id": row[0], "username": row[1], "full_name": row[2], "department": row[3]} for row in cursor.fetchall()]
    conn.close()
    return users