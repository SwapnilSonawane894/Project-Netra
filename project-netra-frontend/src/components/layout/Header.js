// src/components/layout/Header.js (Corrected)
"use client";
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
        {/* --- THIS IS THE FIX: Use user.fullName --- */}
        Welcome, <strong>{user ? user.fullName : 'Guest'}</strong>
      </div>
      <button onClick={logout} className={styles.logoutButton}>
        Logout
      </button>
    </header>
  );
}