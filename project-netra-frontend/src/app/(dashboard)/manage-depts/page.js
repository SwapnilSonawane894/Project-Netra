"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDepartments, createDepartment, deleteDepartment, updateDepartment } from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './manage-depts.module.css';
import Modal from '@/components/ui/Modal';

export default function ManageDeptsPage() {
    const { token } = useAuth();
    const [depts, setDepts] = useState([]);
    // State for create form
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    // State for edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null); // Holds the dept being edited
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');


    const fetchDepts = useCallback(async () => {
        if (!token) return;
        const data = await getDepartments();
        setDepts(data);
    }, [token]);

    useEffect(() => {
        fetchDepts();
    }, [fetchDepts]);

    const handleEditClick = (dept) => {
        setEditingDept(dept);
        setEditName(dept.name);
        setEditCode(dept.code);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDept(null);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateDepartment(editingDept.id, { name: editName, code: editCode });
            alert('Department updated successfully.');
            handleCloseModal();
            fetchDepts();
        } catch (error) {
            alert(`Update Error: ${error.message}`);
        }
    };

    const handleDelete = async (deptId, deptName) => {
        if (!confirm(`Are you sure you want to delete the department: ${deptName}?`)) return;
        try {
            await deleteDepartment(deptId);
            alert('Department deleted successfully.');
            fetchDepts();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // --- THIS IS THE CRITICAL FIX ---
            // Using the correct state variables: newName and newCode
            await createDepartment({ name: newName, code: newCode });
            alert('Department created successfully.');
            setNewName('');
            setNewCode('');
            fetchDepts();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <h1>Manage Departments</h1>
            <Card className={styles.formCard}>
                <h2>Add New Department</h2>
                <form onSubmit={handleSubmit} className={styles.deptForm}>
                    <input type="text" placeholder="Department Name" value={newName} onChange={e => setNewName(e.target.value)} required />
                    <input type="text" placeholder="Code" value={newCode} onChange={e => setNewCode(e.target.value)} required />
                    <Button type="submit" variant="primary">Add Department</Button>
                </form>
            </Card>
            <Card>
                <h2>Existing Departments</h2>
                <table className={styles.deptTable}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {depts.map(dept => (
                            <tr key={dept.id}>
                                <td>{dept.name}</td>
                                <td>{dept.code}</td>
                                <td className={styles.actionsCell}>
                                    <Button onClick={() => handleEditClick(dept)} variant="secondary">Edit</Button>
                                    <Button onClick={() => handleDelete(dept.id, dept.name)} variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Edit Department">
                <form onSubmit={handleUpdate} className={styles.modalForm}>
                    <div className={styles.inputGroup}>
                        <label>Department Name</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Department Code</label>
                        <input type="text" value={editCode} onChange={e => setEditCode(e.target.value)} required />
                    </div>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </form>
            </Modal>
        </div>
    );
}