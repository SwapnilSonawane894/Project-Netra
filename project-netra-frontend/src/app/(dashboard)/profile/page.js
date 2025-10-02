// src/app/(dashboard)/profile/page.js (Final Complete Version)
"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, changePassword } from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, refreshSession } = useAuth();
    
    // State for profile details
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    // State for password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setUsername(user.username || '');
        }
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        try {
            const updatedData = await updateUserProfile({ full_name: fullName, username });
            refreshSession(updatedData.user, updatedData.access_token);
            setProfileSuccess('Profile updated successfully!');
        } catch (error) {
            setProfileError(error.message);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        try {
            await changePassword({ current_password: currentPassword, new_password: newPassword });
            setPasswordSuccess('Password changed successfully!');
            // Clear fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordError(error.message);
        }
    };
    
    if (!user) return <p>Loading...</p>;

    return (
        <div>
            <h1>My Profile</h1>
            <Card>
                <h2>Update Profile Details</h2>
                <form onSubmit={handleProfileSubmit} className={styles.profileForm}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="fullName">Full Name</label>
                        <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                     <div className={styles.inputGroup}>
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    {profileError && <p className={styles.error}>{profileError}</p>}
                    {profileSuccess && <p className={styles.success}>{profileSuccess}</p>}
                    <Button type="submit" variant="primary">Save Profile Changes</Button>
                </form>
            </Card>

            <Card style={{ marginTop: '30px' }}>
                <h2>Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className={styles.profileForm}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="currentPassword">Current Password</label>
                        <input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="newPassword">New Password</label>
                        <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                    {passwordError && <p className={styles.error}>{passwordError}</p>}
                    {passwordSuccess && <p className={styles.success}>{passwordSuccess}</p>}
                    <Button type="submit" variant="secondary">Change Password</Button>
                </form>
            </Card>
        </div>
    );
}