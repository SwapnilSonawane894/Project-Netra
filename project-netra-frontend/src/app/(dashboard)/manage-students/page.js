// src/app/(dashboard)/manage-students/page.js (Corrected and Final)
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import styles from './manage-students.module.css';
import { useAuth } from '../../../context/AuthContext';
// --- THIS IS THE CRITICAL FIX ---
import { getStudents, getStudentsByDept, deleteStudent, registerStudent } from '../../../services/api';
import Webcam from 'react-webcam';


// --- The New Webcam Capture Component with Mirror Fix ---
const WebcamCapture = ({ onCapture }) => {
    const webcamRef = useRef(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            fetch(imageSrc).then(res => res.blob()).then(blob => {
                onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
            });
        }
    }, [webcamRef, onCapture]);

    return (
        <div className={styles.webcamContainer}>
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
                videoConstraints={{ facingMode: "user" }}
                // --- FIX: This prop flips the camera preview horizontally ---
                mirrored={true} 
                onUserMedia={() => setIsCameraReady(true)}
                onUserMediaError={() => alert("Webcam permissions denied. Please allow camera access in your browser settings.")}
            />
            <Button type="button" onClick={capture} disabled={!isCameraReady}>Capture Photo</Button>
        </div>
    );
};


// --- The Updated Registration Form ---
const RegistrationForm = ({ onStudentRegistered, defaultClass }) => {
    const [name, setName] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [studentClass, setStudentClass] = useState(defaultClass || 'TYCO');
    const [parentPhone, setParentPhone] = useState('');
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleCapture = (file) => {
        if (capturedPhotos.length < 3) {
            setCapturedPhotos(prev => [...prev, file]);
        } else {
            alert("Maximum of 3 photos captured.");
        }
    };
    
    const removePhoto = (indexToRemove) => {
        setCapturedPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (capturedPhotos.length !== 3) {
            setError("Please capture exactly 3 photos.");
            return;
        }
        setIsSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('name', name);
        formData.append('roll_no', rollNo);
        formData.append('student_class', studentClass);
        formData.append('parent_phone', parentPhone);
        capturedPhotos.forEach(file => {
            formData.append('photos', file);
        });

        try {
            const result = await registerStudent(formData);
            alert(result.message);
            onStudentRegistered();
            setName(''); setRollNo(''); setParentPhone(''); setCapturedPhotos([]);
        } catch (err) {
            setError(err.message || "An error occurred during registration.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <h3>Register New Student</h3>
            <div className={styles.registrationLayout}>
                <form onSubmit={handleSubmit} className={styles.registrationForm}>
                     <div className={styles.inputGroup}>
                        <label htmlFor="fullName">Full Name</label>
                        <input id="fullName" type="text" placeholder="e.g., Swapnil Sonawane" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="rollNo">Roll No</label>
                        <input id="rollNo" type="text" placeholder="e.g., 142" value={rollNo} onChange={e => setRollNo(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="parentPhone">Parent's Phone (with country code)</label>
                        <input id="parentPhone" type="text" placeholder="e.g., 919876543210" value={parentPhone} onChange={e => setParentPhone(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="class">Class</label>
                        <select id="class" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
                            <option value="FYCO">FYCO</option> <option value="FYME">FYME</option>
                            <option value="SYCO">SYCO</option> <option value="SYME">SYME</option>
                            <option value="TYCO">TYCO</option> <option value="TYME">TYME</option>
                        </select>
                    </div>
                     <div className={styles.submitButton}>
                        <Button type="submit" disabled={isSubmitting || capturedPhotos.length !== 3}>
                            {isSubmitting ? 'Registering...' : 'Register Student'}
                        </Button>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                </form>

                <div className={styles.captureSection}>
                    <h4>Live Capture (3 Photos Required)</h4>
                    <WebcamCapture onCapture={handleCapture} />
                    <div className={styles.thumbnails}>
                        {capturedPhotos.map((photo, index) => (
                            <div key={index} className={styles.thumbnail}>
                                <img src={URL.createObjectURL(photo)} alt={`capture ${index + 1}`} />
                                <button onClick={() => removePhoto(index)}>×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};


// --- Main Page Component ---
export default function ManageStudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    // HOD's department comes from the user object, so no need for separate state
    const [year, setYear] = useState('All');

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        if (!user) return;

        let data = [];
        try {
            if (user.role === 'principal') {
                data = await getStudents();
            } else if (user.role === 'hod' || user.role === 'class-teacher') {
                // HODs and Class Teachers fetch by their assigned department
                data = await getStudentsByDept(user.department);
            }
        } catch (error) {
            console.error("Failed to fetch student data:", error);
            data = [];
        }
        
        setStudents(data);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    const handleRemove = async (rollNo) => {
        if (confirm(`Are you sure you want to remove student with Roll No: ${rollNo}?`)) {
            try {
                await deleteStudent(rollNo);
                alert("Student removed successfully.");
                fetchStudents();
            } catch (error) {
                alert("Failed to remove student.");
            }
        }
    };

    const canManage = user && (user.role === 'principal' || user.role === 'hod' || user.role === 'class-teacher');

    const filteredStudents = year === 'All' ? students : students.filter(s => {
        if (year === 'FY') return s.student_class.startsWith('FY');
        if (year === 'SY') return s.student_class.startsWith('SY');
        if (year === 'TY') return s.student_class.startsWith('TY');
        return true;
    });

    if (loading) return <p>Loading students...</p>;

    return (
        <div>
            <h1>Manage Students</h1>
            
            {canManage && <RegistrationForm onStudentRegistered={fetchStudents} defaultClass="TYCO" />}

            {user && (user.role === 'hod' || user.role === 'principal') && (
                <Card className={styles.filterCard}>
                    <div className={styles.inputGroup}>
                        <label>Filter by Year</label>
                        <select value={year} onChange={e => setYear(e.target.value)}>
                            <option value="All">All Years</option>
                            <option value="FY">First Year</option>
                            <option value="SY">Second Year</option>
                            <option value="TY">Third Year</option>
                        </select>
                    </div>
                </Card>
            )}

            <Card>
                <h3>Existing Students ({filteredStudents.length})</h3>
                <table className={styles.studentTable}>
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Class</th>
                            {canManage && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? filteredStudents.map(student => (
                            <tr key={student.roll_no}>
                                <td>{student.roll_no}</td>
                                <td>{student.name}</td>
                                <td>{student.student_class}</td>
                                {canManage && (
                                    <td>
                                        <Button onClick={() => handleRemove(student.roll_no)} variant="danger">
                                            Remove
                                        </Button>
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={canManage ? 4 : 3}>No students found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}