import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  spinsRemaining: number;
  totalSpins: number;
  createdAt: string;
  lastSpinAt?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  decrementUserSpin: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  'tuancuongnx@gmail.com',
  'tuancuong241298@gmail.com',
  'cuongtt.ptit@gmail.com',
  'admin@bachkhoa.edu.vn',
  'bksamsong@bachkhoa.edu.vn',
  ...(import.meta.env.VITE_FIREBASE_ADMIN_EMAILS || '').split(',').map((email: string) => email.trim().toLowerCase()).filter(Boolean),
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOrCreateProfile = async (user: User, fallbackName?: string) => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUserProfile(data);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || fallbackName || 'Khách mời 20/10',
          spinsRemaining: 3, // 3 free spins for celebration
          totalSpins: 0,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.warn('Error accessing user profile:', err);
      // Fallback local representation if network issue
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || fallbackName || 'Khách mời 20/10',
        spinsRemaining: 3,
        totalSpins: 0,
        createdAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const emailAdmin = Boolean(user.emailVerified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));
        const [, adminResult] = await Promise.allSettled([
          fetchOrCreateProfile(user),
          getDoc(doc(db, 'admins', user.uid)),
        ]);
        setIsAdmin(emailAdmin || (adminResult.status === 'fulfilled' && adminResult.value.exists()));
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      try {
        await updateProfile(userCred.user, { displayName: name.trim() });
      } catch (e) {
        console.warn('Failed to update displayName:', e);
      }
    }
    await fetchOrCreateProfile(userCred.user, name);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await fetchOrCreateProfile(result.user);
  };

  const signInAsGuest = async () => {
    const guestEmail = 'khachmoi.2010@bachkhoa.edu.vn';
    const guestPass = 'BKSamsong2010@2026';
    const guestName = 'Khách mời Bách Khoa';
    try {
      const userCred = await signInWithEmailAndPassword(auth, guestEmail, guestPass);
      await fetchOrCreateProfile(userCred.user, guestName);
    } catch (e: any) {
      if (
        e?.code === 'auth/user-not-found' ||
        e?.code === 'auth/invalid-credential' ||
        e?.message?.includes('user-not-found') ||
        e?.message?.includes('invalid-credential')
      ) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, guestEmail, guestPass);
          await updateProfile(userCred.user, { displayName: guestName });
          await fetchOrCreateProfile(userCred.user, guestName);
          return;
        } catch (createErr) {
          console.warn('Could not create guest user, retrying sign-in:', createErr);
        }
      }
      throw e;
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchOrCreateProfile(currentUser);
    }
  };

  const decrementUserSpin = async (): Promise<number> => {
    if (!currentUser || !userProfile) return 0;
    const newCount = Math.max(0, (userProfile.spinsRemaining ?? 3) - 1);
    const updated: UserProfile = {
      ...userProfile,
      spinsRemaining: newCount,
      totalSpins: (userProfile.totalSpins ?? 0) + 1,
      lastSpinAt: new Date().toISOString(),
    };
    setUserProfile(updated);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        spinsRemaining: newCount,
        totalSpins: updated.totalSpins,
        lastSpinAt: updated.lastSpinAt,
      });
    } catch (err) {
      console.warn('Could not update spin count in Firestore:', err);
    }
    return newCount;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInAsGuest,
        sendPasswordReset,
        signOut,
        refreshProfile,
        decrementUserSpin,
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
