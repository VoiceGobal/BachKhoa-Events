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
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

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
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  decrementUserSpin: () => Promise<number>; // returns updated spins remaining
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  'tuancuong241298@gmail.com',
  'cuongtt.ptit@gmail.com',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isAdmin = Boolean(
    currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase().trim())
  );

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
        await fetchOrCreateProfile(user);
      } else {
        setUserProfile(null);
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

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchOrCreateProfile(currentUser);
    }
  };

  const decrementUserSpin = async (): Promise<number> => {
    if (!currentUser) throw new Error('Cần đăng nhập để thực hiện lượt quay.');
    const userDocRef = doc(db, 'users', currentUser.uid);

    const currentSpins = userProfile?.spinsRemaining ?? 3;
    const currentTotal = userProfile?.totalSpins ?? 0;
    const nextSpins = Math.max(0, currentSpins - 1);
    const nextTotal = currentTotal + 1;
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(userDocRef, {
        spinsRemaining: nextSpins,
        totalSpins: nextTotal,
        lastSpinAt: nowIso,
      });
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              spinsRemaining: nextSpins,
              totalSpins: nextTotal,
              lastSpinAt: nowIso,
            }
          : null
      );
      return nextSpins;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
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
