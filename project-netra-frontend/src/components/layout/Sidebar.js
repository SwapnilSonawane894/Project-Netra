// src/components/layout/Sidebar.js (Updated with Profile Link)
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Sidebar.module.css';

const navLinks = {
    principal: [
        { name: 'Dashboard Home', path: '/attendance' },
        { name: 'Manage Departments', path: '/manage-depts' },
        { name: 'Manage HODs', path: '/manage-hods' },
        { name: 'Attendance Report', path: '/reports' },
    ],
    hod: [
        { name: 'Dashboard Home', path: '/attendance' },
        { name: 'Manage Staff', path: '/manage-staff' },
        { name: 'Manage Subjects', path: '/manage-subjects' },
        { name: 'Timetable', path: '/timetable' },
        { name: 'Attendance Report', path: '/reports' },
    ],
    'mentor': [
        { name: 'Live Attendance', path: '/attendance' },
        { name: 'Manage Students', path: '/manage-students' },
        { name: 'Attendance Report', path: '/reports' },
    ],
    staff: [
        { name: 'Live Attendance', path: '/attendance' },
        { name: 'Attendance Report', path: '/reports' },
    ],
};

export default function Sidebar() {
    const { user } = useAuth();
    const pathname = usePathname();
    const links = user ? navLinks[user.role] : [];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>Project Netra</div>
            <nav className={styles.nav}>
                <ul>
                    {links && links.map(link => (
                        <li key={link.name}>
                            <Link href={link.path} className={pathname === link.path ? styles.active : ''}>
                                {link.name}
                            </Link>
                        </li>
                    ))}
                    {/* --- NEW LINK FOR ALL USERS --- */}
                    {user && (
                         <li>
                            <Link href="/profile" className={pathname === '/profile' ? styles.active : ''}>
                                My Profile
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
        </aside>
    );
}