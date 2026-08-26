import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useToast } from '../components/Toast';

import { subscribeToPushNotifications } from '../lib/pushNotifications';

interface AuthContextType {
  session: Session | null;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, ready: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Safety timeout to prevent permanent white screen
    const timeout = setTimeout(() => {
      setReady(true);
    }, 5000);

    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session && 'Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications();
        }
      })
      .catch(err => {
        console.error("Erro ao carregar sessão:", err);
      })
      .finally(() => {
        setReady(true);
        clearTimeout(timeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === 'SIGNED_OUT') {
          showToast('Sessão expirada ou encerrada. Faça login novamente.', 'info');
          navigate('/login', { replace: true });
        }
        
        if (event === 'SIGNED_IN') {
          if ('Notification' in window && Notification.permission === 'granted') {
            subscribeToPushNotifications();
          }
          const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/cadastro';
          if (isAuthPage) {
            navigate('/home', { replace: true });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session, ready }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
