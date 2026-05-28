import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, ParticipantProfile } from '@mobilize/shared';

interface AuthContextType {
  user: User | null;
  participantProfile: ParticipantProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => Promise<void>;
  setProfile: (profile: ParticipantProfile | null) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<ParticipantProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [participantProfile, setProfileState] = useState<ParticipantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from AsyncStorage on mount
  useEffect(() => {
    async function loadPersistedState() {
      try {
        const storedUser = await AsyncStorage.getItem('@mobilize:user');
        const storedProfile = await AsyncStorage.getItem('@mobilize:profile');

        if (storedUser) {
          setUserState(JSON.parse(storedUser));
        }
        if (storedProfile) {
          setProfileState(JSON.parse(storedProfile));
        }
      } catch (err) {
        console.error('Failed to load persisted auth state:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPersistedState();
  }, []);

  const setUser = async (newUser: User | null) => {
    try {
      setUserState(newUser);
      if (newUser) {
        await AsyncStorage.setItem('@mobilize:user', JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem('@mobilize:user');
      }
    } catch (err) {
      console.error('Error persisting user state:', err);
    }
  };

  const setProfile = async (newProfile: ParticipantProfile | null) => {
    try {
      setProfileState(newProfile);
      if (newProfile) {
        await AsyncStorage.setItem('@mobilize:profile', JSON.stringify(newProfile));
      } else {
        await AsyncStorage.removeItem('@mobilize:profile');
      }
    } catch (err) {
      console.error('Error persisting profile state:', err);
    }
  };

  const logout = async () => {
    try {
      setUserState(null);
      setProfileState(null);
      await AsyncStorage.removeItem('@mobilize:user');
      await AsyncStorage.removeItem('@mobilize:profile');
      const { supabase } = require('../lib/supabase');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during logout state cleanup:', err);
    }
  };

  const updateProfile = async (updates: Partial<ParticipantProfile>) => {
    try {
      if (participantProfile) {
        const updated = { ...participantProfile, ...updates };
        setProfileState(updated);
        await AsyncStorage.setItem('@mobilize:profile', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error updating profile state:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        participantProfile,
        isLoading,
        setUser,
        setProfile,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
