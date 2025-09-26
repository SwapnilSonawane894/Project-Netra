// src/components/layout/Sidebar.js (Corrected and Final)
"use client";
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link'; // Use Next.js Link for better navigation

// --- THIS IS THE CRITICAL FIX ---
// The roles now match the backend: 'principal', 'hod', 'staff'
const navLinks = {
principal: [
{ name: 'Dashboard Home', path: '/' },
{ name: 'Manage HODs', path: '/manage-hods' },
{ name: 'Manage Departments', path: '/manage-depts' },
],
hod: [
{ name: 'Dashboard Home', path: '/' },
{ name: 'Manage Staff', path: '/manage-staff' },
{ name: 'Manage Subjects', path: '/manage-subjects' },
{ name: 'Timetable', path: '/timetable' },
{ name: 'Attendance Report', path: '/reports' },
],
'class-teacher': [ // Special role for a staff member
{ name: 'Dashboard Home', path: '/' },
{ name: 'Live Attendance', path: '/attendance' },
{ name: 'Manage Students', path: '/manage-students' },
{ name: 'My Attendance', path: '/reports' },
],
staff: [
{ name: 'Dashboard Home', path: '/' },
{ name: 'My Attendance', path: '/reports' },
],
};

export default function Sidebar() {
  const { user } = useAuth();

  // Add a safety check: if the user's role doesn't exist, default to an empty array
  const links = user && navLinks[user.role] ? navLinks[user.role] : [];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Project Netra</div>
      <nav>
        <ul>
          {links.map((link) => (
            <li key={link.name}>
              {/* Use the Next.js Link component for client-side routing */}
              <Link href={link.path}>{link.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}