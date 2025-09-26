// src/app/page.js (Corrected and Final)
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This component's only job is to figure out where the user should go.
    const user = localStorage.getItem('user');

    if (user) {
      // If user is logged in, send them to the dashboard.
      // The (dashboard) folder's page.js will handle the rest.
      router.push('/attendance'); 
    } else {
      // If no user, send them to the login page.
      router.push('/login');
    }
    // We don't need to setLoading(false) because the page will be replaced.
  }, [router]);

  // Render a simple loading state while the redirection happens.
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '24px',
      fontFamily: 'sans-serif'
    }}>
      Loading Project Netra...
    </div>
  );
}