// src/app/(dashboard)/manage-staff/page.js (Final, Complete Version)
"use client";
import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import styles from './manage-staff.module.css';
import { getStaff, createStaff, getSubjects } from '../../../services/api';

const StaffRegistrationForm = ({ subjects, onStaffCreated }) => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isClassTeacher, setIsClassTeacher] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const handleSubjectChange = (subjectId) => {
        const id = parseInt(subjectId);
        setSelectedSubjects(prev => 
            prev.includes(id) ? prev.filter(subId => subId !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createStaff({ 
                full_name: fullName, username, password, 
                is_class_teacher: isClassTeacher, 
                subject_ids: selectedSubjects 
            });
            alert('Staff created successfully!');
            onStaffCreated();
            setFullName(''); setUsername(''); setPassword(''); setSelectedSubjects([]); setIsClassTeacher(false);
        } catch (error) {
            alert(`Failed to create staff: ${error.message}`);
        }
    };

     return (
        <Card className={styles.formCard}>
            <h3>Register New Staff</h3>
            <form onSubmit={handleSubmit} className={styles.staffForm}>
                {/* --- THIS IS THE UI FIX: A wrapper for the top inputs --- */}
                <div className={styles.topInputs}>
                    <div className={styles.inputGroup}>
                        <label>Full Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                </div>
                
                <div className={styles.checkboxGroup}>
                    <input type="checkbox" id="isClassTeacher" checked={isClassTeacher} onChange={e => setIsClassTeacher(e.target.checked)} />
                    <label htmlFor="isClassTeacher">Assign as Class Teacher?</label>
                </div>

                <div className={styles.subjectSelector}>
                    <label>Assign Subjects:</label>
                    <div className={styles.subjectList}>
                        {subjects.length > 0 ? subjects.map(subject => (
                            <div key={subject.id} className={styles.subjectItem}>
                                <input 
                                    type="checkbox" id={`sub-${subject.id}`} value={subject.id}
                                    checked={selectedSubjects.includes(subject.id)} 
                                    onChange={(e) => handleSubjectChange(parseInt(e.target.value))}
                                />
                                <label htmlFor={`sub-${subject.id}`}>{subject.name} ({subject.abbreviation})</label>
                            </div>
                        )) : <p>No subjects created yet. Please add subjects first.</p>}
                    </div>
                </div>

                <div className={styles.submitButton}>
                    <Button type="submit">Register Staff</Button>
                </div>
            </form>
        </Card>
    );
};

export default function ManageStaffPage() {
    const [staff, setStaff] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [staffData, subjectsData] = await Promise.all([getStaff(), getSubjects()]);
        setStaff(staffData);
        setSubjects(subjectsData);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <p>Loading data...</p>;

    return (
        <div>
            <h1>Manage Staff</h1>
            <StaffRegistrationForm subjects={subjects} onStaffCreated={fetchData} />
            <Card>
                <h3>Existing Staff Members ({staff.length})</h3>
                <div className={styles.tableContainer}>
                    <table className={styles.staffTable}>
                        <thead>
                            <tr><th>Full Name</th><th>Username</th><th>Department</th></tr>
                        </thead>
                        <tbody>
                            {staff.length > 0 ? staff.map(member => (
                                <tr key={member.id}>
                                    <td>{member.full_name}</td>
                                    <td>{member.username}</td>
                                    <td>{member.department}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3">No staff members found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}