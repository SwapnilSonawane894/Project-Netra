// src/app/(dashboard)/manage-depts/page.js (Final Version)
"use client";
import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import styles from './manage-depts.module.css';
import { getDepartments, createDepartment } from '../../../services/api';

const DeptRegistrationForm = ({ onDeptCreated }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createDepartment({ name, code });
            alert('Department created successfully!');
            onDeptCreated();
            setName(''); setCode('');
        } catch (error) {
            alert(`Failed to create department: ${error.message}`);
        }
    };

    return (
        <Card className={styles.formCard}>
            <h3>Create New Department</h3>
            <form onSubmit={handleSubmit} className={styles.deptForm}>
                <input type="text" placeholder="Full Name (e.g., Computer Engineering)" value={name} onChange={e => setName(e.target.value)} required />
                <input type="text" placeholder="Code (e.g., CO)" value={code} onChange={e => setCode(e.target.value)} required />
                <Button type="submit">Create Department</Button>
            </form>
        </Card>
    );
};

export default function ManageDeptsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const deptsData = await getDepartments();
        setDepartments(deptsData);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <p>Loading data...</p>;

    return (
        <div>
            <h1>Manage Departments</h1>
            <DeptRegistrationForm onDeptCreated={fetchData} />
            <Card>
                <h3>Existing Departments</h3>
                <table className={styles.deptTable}>
                    <thead>
                        <tr><th>Full Name</th><th>Code</th></tr>
                    </thead>
                    <tbody>
                        {departments.map(dept => (
                            <tr key={dept.id}>
                                <td>{dept.name}</td>
                                <td>{dept.code}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}