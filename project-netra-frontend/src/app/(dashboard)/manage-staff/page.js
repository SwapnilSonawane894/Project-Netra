// project-netra-frontend/src/app/(dashboard)/manage-staff/page.js (FINAL - With Your Fix Applied)
"use client";
import { useState, useEffect, useCallback } from 'react';
import {
    getStaff,
    getSubjects,
    createStaff,
    deleteStaff,
    updateStaff,
    getAssignedSubjectsForStaff
} from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import styles from './manage-staff.module.css';

export default function ManageStaffPage() {
    const [staff, setStaff] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [error, setError] = useState(null);

    // State for the "Add New Staff" form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isClassTeacher, setIsClassTeacher] = useState(false);
    const [assignedClass, setAssignedClass] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    // State for the "Edit" modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [editIsClassTeacher, setEditIsClassTeacher] = useState(false);
    const [editAssignedClass, setEditAssignedClass] = useState('');
    const [editSelectedSubjects, setEditSelectedSubjects] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const staffData = await getStaff();
            const subjectsData = await getSubjects();

            setStaff(staffData || []);
            setSubjects(subjectsData || []);
        } catch (err) {
            setError(`Error fetching data: ${err.message}`);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubjectChange = (subjectId) => {
        setSelectedSubjects(prev => 
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('full_name', fullName);
        formData.append('is_class_teacher', isClassTeacher);
        
        // FIX: Append assigned_class if the user is a class teacher
        if (isClassTeacher) {
            if (!assignedClass) {
                alert("Please specify the assigned class for the Class Teacher.");
                return;
            }
            formData.append('assigned_class', assignedClass.toUpperCase());
        }

        selectedSubjects.forEach(subjectId => formData.append('subject_ids', subjectId));

        try {
            await createStaff(formData);
            alert('Staff member created successfully!');
            setUsername('');
            setPassword('');
            setFullName('');
            setIsClassTeacher(false);
            setAssignedClass(''); // Reset the new field
            setSelectedSubjects([]);
            fetchData();
        } catch (err) {
            setError(err.message);
            alert(`Failed to create staff: ${err.message}`);
        }
    };

    const handleDelete = async (staffId, staffName) => {
        if (!window.confirm(`Are you sure you want to delete staff member: ${staffName}?`)) return;
        try {
            await deleteStaff(staffId);
            alert('Staff member deleted successfully.');
            fetchData();
        } catch (err) {
            alert(`Error deleting staff: ${err.message}`);
        }
    };
    
    const handleEditClick = async (staffMember) => {
        setEditingStaff(staffMember);
        setEditIsClassTeacher(staffMember.role === 'mentor');
        setEditAssignedClass(staffMember.assigned_class || '');
        try {
            const assignedIds = await getAssignedSubjectsForStaff(staffMember.id);
            setEditSelectedSubjects(assignedIds);
        } catch (error) {
            alert("Could not fetch assigned subjects for this staff member.");
            setEditSelectedSubjects([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors

    try {
        // This payload now correctly reads from the edit form state variables
        const updatePayload = {
            is_class_teacher: editIsClassTeacher,
            assigned_class: editIsClassTeacher ? editAssignedClass.toUpperCase() : null,
            subject_ids: editSelectedSubjects,
        };

        await updateStaff(editingStaff.id, updatePayload);
        
        alert('Staff member updated successfully.');
        handleCloseModal();
        fetchData(); // Refresh the data to show the changes
    } catch (error) { 
        // Set the error state if something goes wrong
        setError(`Update Error: ${error.message}`); 
    }
};
    
    return (
        <div>
            <h1>Manage Staff</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            {/* "ADD NEW STAFF" CARD & FORM */}
            <Card className={styles.formCard}>
                <h2>Add New Staff Member</h2>
                <form onSubmit={handleSubmit} className={styles.staffForm}>
                    <div className={styles.topInputs}>
                        <div className={styles.inputGroup}>
                            <label>Username</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Full Name</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        </div>
                         <div className={styles.inputGroup}>
                            <label>Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        {isClassTeacher && (
                             <div className={styles.inputGroup}>
                                <label>Assigned Class (e.g., SYCO)</label>
                                <input type="text" value={assignedClass} onChange={e => setAssignedClass(e.target.value)} required placeholder="e.g., SYCO"/>
                            </div>
                        )}
                    </div>
                    
                    <div className={styles.checkboxGroup} style={{gridColumn: '1 / -1'}}>
                        <input type="checkbox" id="isCT" checked={isClassTeacher} onChange={e => setIsClassTeacher(e.target.checked)} />
                        <label htmlFor="isCT">Assign as Class Teacher?</label>
                    </div>

                    <div className={styles.subjectSelector}>
                        <label>Assign Subjects</label>
                        <div className={styles.subjectList}>
                            {subjects.map(sub => (
                                <div key={sub.id} className={styles.subjectItem}>
                                    <input type="checkbox" id={`sub-${sub.id}`} checked={selectedSubjects.includes(sub.id)} onChange={() => handleSubjectChange(sub.id)} />
                                    <label htmlFor={`sub-${sub.id}`}>{sub.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className={styles.submitButton}>
                        <Button type="submit" variant="primary">Add Staff Member</Button>
                    </div>
                </form>
            </Card>

            {/* "EXISTING STAFF" TABLE */}
            <Card>
                <h2>Existing Staff</h2>
                <table className={styles.staffTable}>
                    <thead>
                        <tr><th>Name</th><th>Username</th><th>Role</th><th>Assigned Class</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {staff.map(member => (
                            <tr key={member.id}>
                                <td>{member.full_name}</td>
                                <td>{member.username}</td>
                                <td>{member.role === 'mentor' ? 'Class Teacher' : 'Staff'}</td>
                                <td>{member.assigned_class || 'N/A'}</td>
                                <td style={{display: 'flex', gap: '10px'}}>
                                    <Button onClick={() => handleEditClick(member)}>Edit</Button>
                                    <Button onClick={() => handleDelete(member.id, member.full_name)} variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* --- THIS IS THE CRITICAL FIX YOU FOUND --- */}
            {/* The "isOpen" prop is now correctly passed to the Modal */}
            {isModalOpen && editingStaff && (
                 <Modal isOpen={isModalOpen} onClose={handleCloseModal} >
                    <h2>{`Edit Staff: ${editingStaff?.full_name}`}</h2>
                    <form onSubmit={handleUpdate} className={styles.staffForm}>
                        <div className={styles.checkboxGroup}>
                            <input type="checkbox" id="editIsCT" checked={editIsClassTeacher} onChange={e => setEditIsClassTeacher(e.target.checked)} />
                            <label htmlFor="editIsCT">Assign as Class Teacher?</label>
                        </div>
                        
                        {editIsClassTeacher && (
                             <div className={styles.inputGroup} style={{marginTop: '15px'}}>
                                <label>Assigned Class (e.g., SYCO)</label>
                                <input type="text" value={editAssignedClass} onChange={e => setEditAssignedClass(e.target.value)} required placeholder="e.g., SYCO"/>
                            </div>
                        )}

                        <div className={styles.subjectSelector}>
                            <label>Re-assign Subjects</label>
                            <div className={styles.subjectList}>
                                {subjects.map(sub => (
                                    <div key={sub.id} className={styles.subjectItem}>
                                        <input type="checkbox" id={`edit-sub-${sub.id}`} checked={editSelectedSubjects.includes(sub.id)} onChange={() => setEditSelectedSubjects(prev => prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id])} />
                                        <label htmlFor={`edit-sub-${sub.id}`}>{sub.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button type="submit" variant="primary">Save Changes</Button>
                    </form>
                </Modal>
            )}
        </div>
    );
}