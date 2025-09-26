// src/app/(dashboard)/manage-subjects/page.js (New File)
"use client";
import { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import styles from './manage-subjects.module.css';
import { getSubjects, createSubject } from '../../../services/api';

const SubjectRegistrationForm = ({ onSubjectCreated }) => {
    const [name, setName] = useState('');
    // --- NEW: State for the abbreviation ---
    const [abbreviation, setAbbreviation] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // --- FIX: Send both name and abbreviation ---
            await createSubject({ name, abbreviation });
            alert('Subject added successfully!');
            onSubjectCreated(); 
            setName(''); 
            setAbbreviation(''); // Reset the new field
        } catch (error) {
            alert(`Failed to add subject: ${error.message}`);
        }
    };

    return (
        <Card className={styles.formCard}>
            <h3>Add New Subject</h3>
            {/* --- FIX: Add the new input field for abbreviation --- */}
            <form onSubmit={handleSubmit} className={styles.subjectForm}>
                <input 
                    type="text" 
                    placeholder="Full Subject Name (e.g., Software Engineering)" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                />
                <input 
                    type="text" 
                    placeholder="Abbreviation (e.g., STE)" 
                    value={abbreviation} 
                    // Automatically convert to uppercase as the user types
                    onChange={e => setAbbreviation(e.target.value.toUpperCase())} 
                    required 
                    maxLength="5" // Add a max length for safety
                />
                <Button type="submit">Add Subject</Button>
            </form>
        </Card>
    );
};

export default function ManageSubjectsPage() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchData = useCallback(async () => {
        setLoading(true);
        const data = await getSubjects();
        setSubjects(data);
        setLoading(false);
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return <p>Loading subjects...</p>;

    return (
        <div>
            <h1>Manage Subjects</h1>
            <SubjectRegistrationForm onSubjectCreated={fetchData} />
            <Card>
                <h3>Existing Subjects</h3>
                <table className={styles.subjectTable}>
                    <thead><tr><th>Subject Name</th><th>Department</th></tr></thead>
                    <tbody>
                        {subjects.map(sub => (
                            <tr key={sub.id}><td>{sub.name}</td><td>{sub.department}</td></tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}