import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import FloatingSupport from './FloatingSupport';

export default function Layout() {
  const location = useLocation();
  const allowedPaths = ['/home', '/convite', '/perfil', '/minhas-compras', '/settings'];
  const showNavbar = allowedPaths.includes(location.pathname);

  return (
    <div className="min-h-[100dvh] bg-[#f2f2f2] font-sans text-[#1b1b1b]">
      <main className={showNavbar ? 'pb-[52px]' : ''}>
        <Outlet />
      </main>

      {showNavbar && (
        <>
          {location.pathname !== '/home' && <FloatingSupport />}
          <Navbar />
        </>
      )}
    </div>
  );
}
