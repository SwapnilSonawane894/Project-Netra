// src/app/(dashboard)/layout.js (Corrected)
"use client";
// The AuthProvider should be in the root layout, not here.
// import { AuthProvider } from '../../context/AuthContext'; 
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import styles from './dashboard.module.css';
import { useTimetableScheduler } from '../../hooks/useTimetableScheduler';
import { useAuth } from '../../context/AuthContext'; // Import useAuth here

export default function DashboardLayout({ children }) {
  // Run the scheduler. It updates the global context.
  useTimetableScheduler();
  
  // Read the global state directly from the context.
  const { isVerifying, currentLecture } = useAuth();

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <Header />
        <div className={styles.statusBanner}>
          {isVerifying && currentLecture 
            ? `Live Verification Active: ${currentLecture.subject} with ${currentLecture.teacher || 'N/A'} in Hall ${currentLecture.hall || 'N/A'}`
            : "No active lecture."
          }
        </div>
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}