// src/app/(dashboard)/manage-subjects/page.js (Complete with Delete)
"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSubjects, createSubject, deleteSubject } from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './manage-subjects.module.css';
import Modal from '@/components/ui/Modal';

export default function ManageSubjectsPage() {
    const { token } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [newName, setNewName] = useState('');
    const [newAbbr, setNewAbbr] = useState('');
    // State for edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [editName, setEditName] = useState('');
    const [editAbbr, setEditAbbr] = useState('');
    const fetchSubjects = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getSubjects();
            setSubjects(data);
        } catch (error) {
            alert(`Error fetching subjects: ${error.message}`);
        }
    }, [token]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);
const handleEditClick = (sub) => {
        setEditingSubject(sub);
        setEditName(sub.name);
        setEditAbbr(sub.abbreviation);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => setIsModalOpen(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateSubject(editingSubject.id, { name: editName, abbreviation: editAbbr });
            alert('Subject updated successfully.');
            handleCloseModal();
            fetchSubjects();
        } catch (error) { alert(`Update Error: ${error.message}`); }
    };
    const handleDelete = async (subjectId, subjectName) => {
        if (!confirm(`Are you sure you want to delete the subject: ${subjectName}?`)) return;
        try {
            await deleteSubject(subjectId);
            alert('Subject deleted successfully.');
            fetchSubjects();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // FIX: Use the correct state variables
            await createSubject({ name: newName, abbreviation: newAbbr });
            alert('Subject created successfully.');
            // FIX: Clear the correct state variables
            setNewName('');
            setNewAbbr('');
            fetchSubjects();
        } catch (error) {
            alert(`Error creating subject: ${error.message}`);
        }
    };

    return (
        <div>
            <h1>Manage Subjects</h1>
            <Card className={styles.formCard}>
                <h2>Add New Subject</h2>
                <form onSubmit={handleSubmit} className={styles.subjectForm}>
                    <input type="text" placeholder="Subject Name (e.g., Software Engineering)" value={newName} onChange={e => setNewName(e.target.value)} required />
                    <input type="text" placeholder="Abbreviation (e.g., SE)" value={newAbbr} onChange={e => setNewAbbr(e.target.value)} required />
                    <Button type="submit" variant="primary">Add Subject</Button>
                </form>
            </Card>

            <Card>
                <h2>Existing Subjects</h2>
                <table className={styles.subjectTable}>
                    <thead><tr><th>Name</th><th>Abbr.</th><th>Actions</th></tr></thead>
                    <tbody>
                        {subjects.map(sub => (
                            <tr key={sub.id}>
                                <td>{sub.name}</td>
                                <td>{sub.abbreviation}</td>
                                <td className={styles.actionsCell}>
                                    <Button onClick={() => handleEditClick(sub)} variant="secondary">Edit</Button>
                                    <Button onClick={() => handleDelete(sub.id, sub.name)} variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Edit Subject">
                <form onSubmit={handleUpdate} className={styles.modalForm}>
                    <div className={styles.inputGroup}>
                        <label>Subject Name</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Abbreviation</label>
                        <input type="text" value={editAbbr} onChange={e => setEditAbbr(e.target.value)} required />
                    </div>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </form>
            </Modal>
        </div>
    );
}