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
#hhdfd
def _get_department_id_by_code(cursor, dept_code):
    if not dept_code:
        return None
    cursor.execute("SELECT id FROM departments WHERE code = ?", (dept_code,))
    result = cursor.fetchone()
    return result[0] if result else None

def initialize_database():
    """Creates all tables ONCE. This should only be called from main.py on startup."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL,
            assigned_class TEXT, -- e.g., 'SYCO', 'TYCO'. Only for mentors.
            department_id INTEGER,
            FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
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
            roll_no TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            student_class TEXT NOT NULL,
            parent_phone_number TEXT,
            department_id INTEGER,
            arcface_embedding BLOB NOT NULL,
            FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
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
                       ('p', auth.get_password_hash('p'), 'Principal User', 'principal'))
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN assigned_class TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists, do nothing
    conn.commit()
    conn.close()
    
    print("Database initialized successfully.")

def get_user_by_username(username: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # --- FIX: Select the new assigned_class column ---
    query = """
        SELECT u.id, u.username, u.password_hash, u.full_name, u.role, d.code, u.assigned_class 
        FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.username = ?
    """
    cursor.execute(query, (username,))
    row = cursor.fetchone()
    conn.close()
    if not row: return None
    return {"id": row[0], "username": row[1], "password_hash": row[2], "full_name": row[3], "role": row[4], "department": row[5], "assigned_class": row[6]}

def create_user(username, password, full_name, role, department=None, assigned_class=None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        department_id = _get_department_id_by_code(cursor, department)
        hashed_password = auth.get_password_hash(password)
        # --- FIX: Insert the assigned_class ---
        cursor.execute(
            "INSERT INTO users (username, password_hash, full_name, role, department_id, assigned_class) VALUES (?, ?, ?, ?, ?, ?)",
            (username, hashed_password, full_name, role, department_id, assigned_class)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return {"id": user_id, "username": username, "full_name": full_name, "role": role, "department": department, "assigned_class": assigned_class}
    except sqlite3.IntegrityError:
        conn.close()
        return None

# --- STUDENT MANAGEMENT ---

def recreate_students_table():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS students")
    conn.commit()
    conn.close()
    initialize_database()

def add_student(roll_no, name, student_class, embedding, parent_phone_number=None, department=None):
    """Adds a student. Translates department code to ID before inserting."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # --- CHANGE: Look up department ID from the code ---
    department_id = _get_department_id_by_code(cursor, department)
    serialized_embedding = pickle.dumps(embedding)
    cursor.execute(
        "REPLACE INTO students (roll_no, name, student_class, parent_phone_number, department_id, arcface_embedding) VALUES (?, ?, ?, ?, ?, ?)",
        (roll_no, name, student_class, parent_phone_number, department_id, serialized_embedding)
    )
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
    """Fetches all students, JOINS department to get the code."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        # --- CHANGE: LEFT JOIN to fetch department code ---
        query = """
            SELECT s.roll_no, s.name, s.student_class, d.code
            FROM students s
            LEFT JOIN departments d ON s.department_id = d.id
            ORDER BY s.roll_no
        """
        cursor.execute(query)
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
    # --- FIX: JOIN with students table to get student_class ---
    query = """
        SELECT ar.*, s.student_class 
        FROM attendance_records ar
        LEFT JOIN students s ON ar.roll_no = s.roll_no
        WHERE ar.attendance_date = ? 
        ORDER BY ar.timestamp DESC
    """
    cursor.execute(query, (query_date,))
    rows = cursor.fetchall()
    # --- FIX: Add student_class to the output dictionary ---
    records = [{
        "id": r[0], "roll_no": r[1], "name": r[2], "date": r[3], 
        "subject": r[4], "teacher": r[5], "hall": r[6], "time_slot": r[7], 
        "timestamp": r[8], "student_class": r[9]
    } for r in rows]
    conn.close()
    return records

def get_absent_students_for_lecture(filter_date, subject, time_slot, student_class):
    """
    Finds absent students for a specific lecture, BUT ONLY checks students
    from the relevant class.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # --- THIS IS THE CRITICAL FIX ---
    # Instead of getting ALL students, we only get students from the specified class.
    cursor.execute("SELECT roll_no FROM students WHERE student_class = ?", (student_class,))
    
    relevant_students = {row[0] for row in cursor.fetchall()}
    
    # Now, find which of THESE students were present
    cursor.execute(
        "SELECT DISTINCT roll_no FROM attendance_records WHERE attendance_date = ? AND subject = ? AND time_slot = ?",
        (filter_date, subject, time_slot)
    )
    present_students = {row[0] for row in cursor.fetchall()}
    
    # The absentees are the ones from the relevant class who were not present
    absent_roll_nos = relevant_students - present_students

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


def get_subjects_and_staff_by_department(department: str):
    """
    Fetches all subjects for a department and lists the staff assigned to each.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # This is a complex query that joins three tables
    query = """
        SELECT s.id, s.name, s.abbreviation, u.full_name
        FROM subjects s
        LEFT JOIN staff_subjects ss ON s.id = ss.subject_id
        LEFT JOIN users u ON ss.staff_id = u.id
        WHERE s.department = ?
        ORDER BY s.name, u.full_name
    """
    cursor.execute(query, (department,))
    
    # Process the results into a structured dictionary
    subjects = {}
    for sub_id, sub_name, sub_abbr, staff_name in cursor.fetchall():
        if sub_id not in subjects:
            subjects[sub_id] = {
                "id": sub_id,
                "name": sub_name,
                "abbreviation": sub_abbr,
                "staff": []
            }
        if staff_name:
            subjects[sub_id]["staff"].append(staff_name)
            
    conn.close()
    return list(subjects.values())

def get_attendance_records_by_teacher(teacher_name: str, filter_date=None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    query_date = filter_date if filter_date else date.today().isoformat()
    # --- FIX: JOIN with students table to get student_class ---
    query = """
        SELECT ar.*, s.student_class
        FROM attendance_records ar
        LEFT JOIN students s ON ar.roll_no = s.roll_no
        WHERE ar.teacher = ? AND ar.attendance_date = ? 
        ORDER BY ar.time_slot DESC, ar.name ASC
    """
    cursor.execute(query, (teacher_name, query_date))
    rows = cursor.fetchall()
    # --- FIX: Add student_class to the output dictionary ---
    records = [{
        "id": r[0], "roll_no": r[1], "name": r[2], "date": r[3], 
        "subject": r[4], "teacher": r[5], "hall": r[6], "time_slot": r[7], 
        "timestamp": r[8], "student_class": r[9]
    } for r in rows]
    conn.close()
    return records

def delete_department(dept_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM departments WHERE id = ?", (dept_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

def update_department(dept_id: int, name: str, code: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE departments SET name = ?, code = ? WHERE id = ?", (name, code, dept_id))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def create_subject(name: str, abbreviation: str, department: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
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
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, abbreviation, department FROM subjects WHERE department = ? ORDER BY name", (department,))
    subjects = [{"id": row[0], "name": row[1], "abbreviation": row[2], "department": row[3]} for row in cursor.fetchall()]
    conn.close()
    return subjects

def delete_subject(subject_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
  
def update_user_profile(user_id: int, full_name: str, username: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET full_name = ?, username = ? WHERE id = ?", (full_name, username, user_id))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def change_user_password(user_id: int, new_password_hash: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database error changing password: {e}")
        conn.close()
        return False

def update_subject(subject_id: int, name: str, abbreviation: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE subjects SET name = ?, abbreviation = ? WHERE id = ?", (name, abbreviation, subject_id))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def assign_subjects_to_staff(staff_id: int, subject_ids: list[int]):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    for subject_id in subject_ids:
        cursor.execute("INSERT OR IGNORE INTO staff_subjects (staff_id, subject_id) VALUES (?, ?)", (staff_id, subject_id))
    conn.commit()
    conn.close()

def update_staff_role(staff_id: int, is_class_teacher: bool):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    new_role = 'mentor' if is_class_teacher else 'staff'
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, staff_id))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

def update_staff_subjects(staff_id: int, subject_ids: list[int]):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM staff_subjects WHERE staff_id = ?", (staff_id,))
    for subject_id in subject_ids:
        cursor.execute("INSERT INTO staff_subjects (staff_id, subject_id) VALUES (?, ?)", (staff_id, subject_id))
    conn.commit()
    conn.close()

def get_assigned_subject_ids_for_staff(staff_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT subject_id FROM staff_subjects WHERE staff_id = ?", (staff_id,))
    subject_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    return subject_ids

def update_hod_department(hod_id: int, department_code: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        department_id = _get_department_id_by_code(cursor, department_code)
        if department_id is None: return False
        cursor.execute("UPDATE users SET department_id = ? WHERE id = ?", (department_id, hod_id))
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception:
        conn.close()
        return False

def update_student(roll_no: str, name: str, student_class: str, parent_phone_number: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE students SET name = ?, student_class = ?, parent_phone_number = ? WHERE roll_no = ?",
            (name, student_class, parent_phone_number, roll_no)
        )
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Database error updating student: {e}")
        conn.close()
        return False

def update_staff_role_and_class(staff_id: int, is_class_teacher: bool, assigned_class: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    new_role = 'mentor' if is_class_teacher else 'staff'
    # If they are not a class teacher, their assigned class should be null
    final_assigned_class = assigned_class if is_class_teacher else None
    
    cursor.execute("UPDATE users SET role = ?, assigned_class = ? WHERE id = ?", (new_role, final_assigned_class, staff_id))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

def get_users_by_role(role: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    query = """
        SELECT u.id, u.username, u.full_name, d.code FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = ? ORDER BY u.full_name
    """
    cursor.execute(query, (role,))
    users = [{"id": row[0], "username": row[1], "full_name": row[2], "department": row[3]} for row in cursor.fetchall()]
    conn.close()
    return users

def get_all_staff():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    query = """
        SELECT u.id, u.username, u.full_name, d.code, u.role, u.assigned_class
        FROM users u LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role IN ('staff', 'mentor') ORDER BY u.full_name
    """
    cursor.execute(query)
    users = [{"id": r[0], "username": r[1], "full_name": r[2], "department": r[3], "role": r[4], "assigned_class": r[5]} for r in cursor.fetchall()]
    conn.close()
    return users

def get_users_by_role_and_department(roles: list[str], department_code: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    placeholders = ','.join('?' for _ in roles)
    
    # FIX: Add u.assigned_class to the SELECT statement
    query = f"""
        SELECT u.id, u.username, u.full_name, d.code, u.role, u.assigned_class
        FROM users u
        JOIN departments d ON u.department_id = d.id
        WHERE u.role IN ({placeholders}) AND d.code = ?
        ORDER BY u.full_name
    """
    
    cursor.execute(query, (*roles, department_code))
    
    # FIX: Add "assigned_class": row[5] to the dictionary creation
    users = [{"id": row[0], "username": row[1], "full_name": row[2], "department": row[3], "role": row[4], "assigned_class": row[5]} for row in cursor.fetchall()]
    conn.close()
    return users

def delete_user(user_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

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
    cursor.execute("SELECT id, name, code FROM departments ORDER BY name")
    depts = [{"id": row[0], "name": row[1], "code": row[2]} for row in cursor.fetchall()]
    conn.close()
    return depts

def get_student_class(roll_no: str):
    """Get the class of a specific student by roll number."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT student_class FROM students WHERE roll_no = ?", (roll_no,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def get_student_data_by_class(student_class: str):
    """Get student data filtered by class for attendance verification."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT roll_no, name, arcface_embedding FROM students WHERE student_class = ?", (student_class,))
        rows = cursor.fetchall()
        conn.close()
        return {row[0]: {"name": row[1], "arcface_embedding": pickle.loads(row[2])} for row in rows}
    except sqlite3.OperationalError:
        return {}