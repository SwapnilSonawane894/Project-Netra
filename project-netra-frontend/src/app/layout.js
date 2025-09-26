// src/app/layout.js
import { AuthProvider } from '../context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Project Netra v5',
  description: 'Live Attendance Verification System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}