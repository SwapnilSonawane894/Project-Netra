// src/app/(dashboard)/manage-hods/page.js (Final Version)
"use client";
import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import styles from './manage-hods.module.css';
import { getHods, createHod, getDepartments } from '../../../services/api';

const HodRegistrationForm = ({ departments, onHodCreated }) => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState(departments[0]?.code || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createHod({ full_name: fullName, username, password, department });
            alert('HOD created successfully!');
            onHodCreated(); // Refresh the list
            setFullName(''); setUsername(''); setPassword('');
        } catch (error) {
            alert(`Failed to create HOD: ${error.message}`);
        }
    };

    return (
        <Card className={styles.formCard}>
            <h3>Register New HOD</h3>
            <form onSubmit={handleSubmit} className={styles.hodForm}>
                <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <select value={department} onChange={e => setDepartment(e.target.value)} required>
                    <option value="" disabled>Select Department</option>
                    {departments.map(dept => <option key={dept.code} value={dept.code}>{dept.name}</option>)}
                </select>
                <Button type="submit">Register HOD</Button>
            </form>
        </Card>
    );
};

export default function ManageHodsPage() {
    const [hods, setHods] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [hodsData, deptsData] = await Promise.all([getHods(), getDepartments()]);
        setHods(hodsData);
        setDepartments(deptsData);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <p>Loading data...</p>;

    return (
        <div>
            <h1>Manage HODs</h1>
            <HodRegistrationForm departments={departments} onHodCreated={fetchData} />
            <Card>
                <h3>Existing HODs</h3>
                <table className={styles.hodTable}>
                    <thead>
                        <tr><th>Full Name</th><th>Username</th><th>Department</th></tr>
                    </thead>
                    <tbody>
                        {hods.map(hod => (
                            <tr key={hod.id}>
                                <td>{hod.full_name}</td>
                                <td>{hod.username}</td>
                                <td>{hod.department}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}