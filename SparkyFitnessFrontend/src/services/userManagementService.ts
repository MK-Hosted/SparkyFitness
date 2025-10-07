import { api } from './api';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  isActive: boolean;
  created_at?: string;
  last_login_at?: string;
}

export const userManagementService = {
  getUsers: async (
    searchTerm: string = '',
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<User[]> => {
    try {
      const response = await api.get('/admin/users', {
        params: { searchTerm, sortBy, sortOrder },
      });
      return response.map((user: any) => ({
        ...user,
        isActive: user.is_active, // Map backend's is_active to frontend's isActive
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },


  deleteUser: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/admin/users/${userId}`);
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },


  resetUserPassword: async (userId: string): Promise<void> => {
    try {
      await api.post(`/admin/users/${userId}/reset-password`);
    } catch (error) {
      console.error(`Error resetting password for user ${userId}:`, error);
      throw error;
    }
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<void> => {
    try {
      await api.put(`/admin/users/${userId}/status`, { body: { isActive } });
    } catch (error) {
      console.error(`Error updating status for user ${userId}:`, error);
      throw error;
    }
  },

  updateUserRole: async (userId: string, role: string): Promise<void> => {
    try {
      await api.put(`/admin/users/${userId}/role`, { body: { role } });
    } catch (error) {
      console.error(`Error updating role for user ${userId}:`, error);
      throw error;
    }
  },


  updateUserFullName: async (userId: string, full_name: string): Promise<void> => {
    try {
      await api.put(`/admin/users/${userId}/full-name`, { body: { fullName: full_name } });
    } catch (error) {
      console.error(`Error updating full name for user ${userId}:`, error);
      throw error;
    }
  },
};