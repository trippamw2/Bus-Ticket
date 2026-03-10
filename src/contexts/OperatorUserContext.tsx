import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type OperatorUser = Database['public']['Tables']['operator_users']['Row'];
type OperatorUserInsert = Database['public']['Tables']['operator_users']['Insert'];
type OperatorUserUpdate = Database['public']['Tables']['operator_users']['Update'];

interface OperatorUserContextType {
  users: OperatorUser[];
  loading: boolean;
  error: string | null;
  fetchUsers: (operatorId: string) => Promise<void>;
  addUser: (user: Omit<OperatorUserInsert, 'operator_id' | 'created_at' | 'updated_at'>, operatorId: string) => Promise<{ error: Error | null }>;
  updateUser: (id: string, updates: OperatorUserUpdate) => Promise<{ error: Error | null }>;
  deleteUser: (id: string) => Promise<{ error: Error | null }>;
  inviteUser: (email: string, fullName: string, role: string, operatorId: string) => Promise<{ error: Error | null }>;
}

const OperatorUserContext = createContext<OperatorUserContextType | undefined>(undefined);

export function OperatorUserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<OperatorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (operatorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('operator_users')
        .select('*')
        .eq('operator_id', operatorId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user: Omit<OperatorUserInsert, 'operator_id' | 'created_at' | 'updated_at'>, operatorId: string) => {
    try {
      const { error: insertError } = await supabase
        .from('operator_users')
        .insert({
          ...user,
          operator_id: operatorId,
        });

      if (insertError) throw insertError;
      await fetchUsers(operatorId);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to add user') };
    }
  };

  const updateUser = async (id: string, updates: OperatorUserUpdate) => {
    try {
      const { error: updateError } = await supabase
        .from('operator_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Refresh users
      const { data: user } = await supabase
        .from('operator_users')
        .select('operator_id')
        .eq('id', id)
        .single();
      
      if (user) {
        await fetchUsers(user.operator_id);
      }
      
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to update user') };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('operator_users')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setUsers(prev => prev.filter(u => u.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to delete user') };
    }
  };

  const inviteUser = async (email: string, fullName: string, role: string, operatorId: string) => {
    try {
      // In a real app, this would trigger an invitation email
      // For now, we create a pending user record
      const { error: inviteError } = await supabase
        .from('operator_users')
        .insert({
          operator_id: operatorId,
          email,
          full_name: fullName,
          role,
          is_active: false, // Will be activated after email verification
        });

      if (inviteError) throw inviteError;
      await fetchUsers(operatorId);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to invite user') };
    }
  };

  return (
    <OperatorUserContext.Provider
      value={{
        users,
        loading,
        error,
        fetchUsers,
        addUser,
        updateUser,
        deleteUser,
        inviteUser,
      }}
    >
      {children}
    </OperatorUserContext.Provider>
  );
}

export function useOperatorUsers() {
  const context = useContext(OperatorUserContext);
  if (context === undefined) {
    throw new Error('useOperatorUsers must be used within an OperatorUserProvider');
  }
  return context;
}
