import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Operator {
  id: string;
  name: string;
  phone: string;
  company_name: string | null;
  company_address: string | null;
  company_reg_number: string | null;
  contact_email: string | null;
  contact_person: string | null;
  status: string;
  commission_percent: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  operator: Operator | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, phone: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOperator = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching operator:', error);
      } else if (data) {
        setOperator(data as Operator);
      }
    } catch (error) {
      console.error('Error in fetchOperator:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOperator(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOperator(session.user.id);
      } else {
        setOperator(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      // Check if operator exists and is approved
      const { data: op } = await supabase
        .from('operators')
        .select('status')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!op) {
        await supabase.auth.signOut();
        return { error: new Error('No operator account found for this email.') };
      }

      if (op.status !== 'approved') {
        await supabase.auth.signOut();
        return { error: new Error('Your account is pending approval. Please contact the administrator.') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, phone: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error };

      if (data.user) {
        const { error: operatorError } = await supabase.from('operators').insert({
          id: data.user.id,
          name,
          phone,
          company_name: name,
          status: 'pending',
        });

        if (operatorError) {
          return { error: operatorError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOperator(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, operator, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
