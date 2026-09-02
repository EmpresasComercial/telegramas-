/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ptvmqurxtciyqxdpsuen.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dm1xdXJ4dGNpeXF4ZHBzdWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTMyMTEsImV4cCI6MjA5MjM4OTIxMX0.fAlsIBUdxU29-nEe3xAc4MCSgfQzwjbuPkRlwAFvSzc';

const customFetch = async (url: URL | RequestInfo, options: RequestInit = {}): Promise<Response> => {
  if (!navigator.onLine) {
    window.dispatchEvent(new CustomEvent('app:offline'));
    return Promise.reject(new Error('Offline'));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      window.dispatchEvent(new CustomEvent('app:timeout'));
      return Promise.reject(new Error('Request Timeout'));
    }
    throw error;
  }
};

import { Database } from '../types/supabase';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  }
});

