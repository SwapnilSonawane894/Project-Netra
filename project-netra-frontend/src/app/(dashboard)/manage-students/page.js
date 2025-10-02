// src/app/(dashboard)/manage-students/page.js (Corrected with Final Department Logic)
"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '@/context/AuthContext';
import { getStudents, registerStudent, deleteStudent, updateStudent } from '@/services/api';
import styles from './manage-students.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const getClassesForDepartment = (departmentCode, userRole) => {
    // If the user is a principal, they should see all possible classes
    if (userRole === 'principal') {
        return ['FYCO', 'SYCO', 'TYCO', 'FYME', 'SYME', 'TYME', 'FYEE', 'SYEE', 'TYEE', 'FYCE', 'SYCE', 'TYCE'];
    }

    // For HODs and Class Teachers, show classes based on their specific department
    switch (departmentCode) {
        case 'CO':
            return ['FYCO', 'SYCO', 'TYCO'];
        case 'ME':
            return ['FYME', 'SYME', 'TYME'];
        case 'EE':
            return ['FYEE', 'SYEE', 'TYEE'];
        case 'CE':
            return ['FYCE', 'SYCE', 'TYCE'];
        default:
            // If the user has an unknown or null department, they can't assign classes.
            return [];
    }
};

export default function ManageStudentsPage() {
    const { user, token } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    

    
    // --- NEW: Determine if the user is a class teacher with a specific class ---
    const isClassTeacherWithClass = user?.role === 'class-teacher' && user?.assignedClass;
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [availableClasses, setAvailableClasses] = useState([]);


    // State for create form
    const [rollNo, setRollNo] = useState('');
    const [name, setName] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [photos, setPhotos] = useState([]);
    // State for edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editName, setEditName] = useState('');
    const [editStudentClass, setEditStudentClass] = useState('');
    const [editParentPhone, setEditParentPhone] = useState('');
    
    const webcamRef = useRef(null);
    
    useEffect(() => {
        if (user) {
            console.log("Auth user object:", user);

            // *** THIS IS THE CRITICAL FIX ***
            // We are now accessing user.department instead of user.dept
            const classes = getClassesForDepartment(user.department, user.role);
            
            console.log(`User department: '${user.department}', Role: '${user.role}'. Found classes:`, classes);

            setAvailableClasses(classes);
            
            // If user is a class teacher, pre-fill and lock the class field
            if (isClassTeacherWithClass) {
                setStudentClass(user.assignedClass);
            } else if (classes.length > 0) {
                setStudentClass(classes[0]);
            } else {
                setStudentClass('');
            }
        }
    }, [user, isClassTeacherWithClass]);

    // --- NEW: Filter the student list based on the user's role and assigned class ---
    const filteredStudents = useMemo(() => {
        if (isClassTeacherWithClass) {
            return students.filter(s => s.student_class === user.assignedClass);
        }
        return students; // HODs and Principals see all students
    }, [students, isClassTeacherWithClass, user]);

    const fetchStudents = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await getStudents();
            setStudents(data);
        } catch (err) {
            setError('Could not load student data.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            const classes = getClassesForDepartment(user.department, user.role);
            setAvailableClasses(classes);
            if (classes.length > 0) setStudentClass(classes[0]);
        }
        if (token) fetchStudents();
    }, [user, token, fetchStudents]);

    const handleEditClick = (student) => {
        setEditingStudent(student);
        setEditName(student.name);
        setEditStudentClass(student.student_class);
        setEditParentPhone(student.parent_phone_number || ''); // Handle if phone is null
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateStudent(editingStudent.roll_no, {
                name: editName,
                student_class: editStudentClass,
                parent_phone: editParentPhone,
            });
            alert('Student updated successfully.');
            handleCloseModal();
            fetchStudents(); // Refresh the list
        } catch (error) {
            alert(`Update Error: ${error.message}`);
        }
    };

    const handleDelete = async (rollNo, studentName) => {
        if (!confirm(`Are you sure you want to delete student: ${studentName} (${rollNo})?`)) return;
        try {
            await deleteStudent(rollNo);
            alert('Student deleted successfully.');
            fetchStudents(); // Refresh the list
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (photos.length < 3) {
            setError('Please capture at least 3 photos.');
            return;
        }

        const formData = new FormData();
        formData.append('roll_no', rollNo);
        formData.append('name', name);
        formData.append('student_class', studentClass);
        formData.append('parent_phone', parentPhone);
        
        photos.forEach((photo, index) => {
            const blob = dataURLtoBlob(photo);
            formData.append('photos', blob, `capture_${index}.jpg`);
        });

        try {
            const result = await registerStudent(formData);
            setSuccess(result.message);
            // Clear form
            setRollNo('');
            setName('');
            setParentPhone('');
            setPhotos([]);
            document.getElementById("student-reg-form").reset(); // Reset form fields
            
            fetchStudents(); // Refresh student list
        } catch (err) {
            setError(err.message);
        }
    };

    const capturePhoto = useCallback(() => {
        if (photos.length >= 5) {
            setError("You can capture a maximum of 5 photos.");
            return;
        }
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            setPhotos([...photos, imageSrc]);
        }
    }, [photos]);

    const removePhoto = (index) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    return (
        <div>
            <h1>Manage Students</h1>
            
            {(user?.role === 'hod' || user?.role === 'class-teacher' || user?.role === 'principal') && (
            <Card>
                <h2>Register New Student</h2>
                <div className={styles.registrationLayout}>
                    <form id="student-reg-form" onSubmit={handleSubmit} className={styles.registrationForm}>
                         <div className={styles.inputGroup}>
                            <label htmlFor="rollNo">Roll Number</label>
                            <input id="rollNo" type="text" key={`roll-${rollNo}`} defaultValue={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="name">Full Name</label>
                            <input id="name" type="text" key={`name-${name}`} defaultValue={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        {/* --- NEW: Conditional Rendering for the Class Field --- */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="studentClass">Class</label>
                            {isClassTeacherWithClass ? (
                                <input type="text" value={user.assignedClass} disabled readOnly />
                            ) : (
                                <select id="studentClass" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required>
                                    {availableClasses.length > 0 ? (
                                        availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)
                                    ) : (
                                        <option value="" disabled>No classes available for your department</option>
                                    )}
                                </select>
                            )}
                        </div>
                         <div className={styles.inputGroup}>
                            <label htmlFor="parentPhone">Parent&apos;s Phone (e.g., 919876543210)</label>
                            <input id="parentPhone" type="text" key={`phone-${parentPhone}`} defaultValue={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
                        </div>
                        {error && <p className={styles.error}>{error}</p>}
                        {success && <p style={{color: 'green'}}>{success}</p>}
                        <div className={styles.submitButton}>
                            <Button type="submit">Register Student</Button>
                        </div>
                    </form>

                    <div className={styles.captureSection}>
                        <div className={styles.webcamContainer}>
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" />
                        </div>
                        <Button onClick={capturePhoto} disabled={photos.length >= 5}>Capture Photo ({photos.length}/5)</Button>
                        <div className={styles.thumbnails}>
                            {photos.map((src, index) => (
                                <div key={index} className={styles.thumbnail}>
                                    <img src={src} alt={`Capture ${index + 1}`} />
                                    <button onClick={() => removePhoto(index)}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
            )}

             <Card style={{ marginTop: '30px' }}>
                <h2>Student List</h2>
                {loading ? <p>Loading students...</p> : (
                    <table className={styles.studentTable}>
                         <thead>
                            <tr>
                                <th>Roll No</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Department</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.roll_no}>
                                    <td>{student.roll_no}</td>
                                    <td>{student.name}</td>
                                    <td>{student.student_class}</td>
                                    <td>{student.department || 'Unassigned'}</td>
                                    <td className={styles.actionsCell}>
                                        <Button onClick={() => handleEditClick(student)} variant="secondary">Edit</Button>
                                        <Button onClick={() => handleDelete(student.roll_no, student.name)} variant="danger">Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Edit Student: ${editingStudent?.name}`}>
                <form onSubmit={handleUpdate} className={styles.modalForm}>
                    <div className={styles.inputGroup}>
                        <label>Full Name</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Class</label>
                        <select value={editStudentClass} onChange={e => setEditStudentClass(e.target.value)} required>
                            {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Parent's Phone</label>
                        <input type="text" value={editParentPhone} onChange={e => setEditParentPhone(e.target.value)} required />
                    </div>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </form>
            </Modal>
        </div>
    );
}