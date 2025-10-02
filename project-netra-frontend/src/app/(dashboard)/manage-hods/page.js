"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getHods, createHod, deleteHod, getDepartments, updateHodDepartment } from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './manage-hods.module.css';
import Modal from '@/components/ui/Modal'

export default function ManageHodsPage() {
    const { token } = useAuth();
    const [hods, setHods] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHod, setEditingHod] = useState(null);
    const [editDepartment, setEditDepartment] = useState('');
    const fetchData = useCallback(async () => {
        if (!token) return;
        const hodsData = await getHods();
        const deptsData = await getDepartments();
        setHods(hodsData);
        setDepartments(deptsData);
        if (deptsData.length > 0) {
            setDepartment(deptsData[0].code);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    const handleEditClick = (hod) => {
        setEditingHod(hod);
        setEditDepartment(hod.department);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => setIsModalOpen(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateHodDepartment(editingHod.id, editDepartment);
            alert("HOD's department updated successfully.");
            handleCloseModal();
            fetchData();
        } catch (error) { alert(`Update Error: ${error.message}`); }
    };

    const handleDelete = async (hodId, hodName) => {
        if (!confirm(`Are you sure you want to delete HOD: ${hodName}?`)) return;
        try {
            await deleteHod(hodId);
            alert('HOD deleted successfully.');
            fetchData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createHod({ username, password, full_name: fullName, department });
            alert('HOD created successfully.');
            setUsername('');
            setPassword('');
            setFullName('');
            fetchData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <h1>Manage HODs</h1>
            <Card className={styles.formCard}>
                <h2>Add New HOD</h2>
                <form onSubmit={handleSubmit} className={styles.hodForm}>
                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                    <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <select value={department} onChange={e => setDepartment(e.target.value)} required>
                        {departments.map(d => <option key={d.id} value={d.code}>{d.name}</option>)}
                    </select>
                    <Button type="submit" variant="primary">Add HOD</Button>
                </form>
            </Card>
            <Card>
                <h2>Existing HODs</h2>
                <table className={styles.hodTable}>
                    <thead><tr><th>Name</th><th>Department</th><th>Actions</th></tr></thead>
                    <tbody>
                        {hods.map(hod => (
                            <tr key={hod.id}>
                                <td>{hod.full_name}</td>
                                <td>{hod.department}</td>
                                <td className={styles.actionsCell}>
                                    <Button onClick={() => handleEditClick(hod)} variant="secondary">Edit</Button>
                                    <Button onClick={() => handleDelete(hod.id, hod.full_name)} variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Re-assign HOD: ${editingHod?.full_name}`}>
                <form onSubmit={handleUpdate} className={styles.modalForm}>
                     <div className={styles.inputGroup}>
                        <label>New Department</label>
                        <select value={editDepartment} onChange={e => setEditDepartment(e.target.value)} required>
                            {departments.map(d => <option key={d.id} value={d.code}>{d.name}</option>)}
                        </select>
                    </div>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </form>
            </Modal>
        </div>
    );
}