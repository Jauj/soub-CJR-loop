import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAILS = ["ferrierjonas@gmail.com", "cjr.soub@gmail.com", "admin@cjr.fr"];

export const useAuth = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const isAdmin = user && user.email && (user.emailVerified || user.email === "admin@cjr.fr") && ADMIN_EMAILS.includes(user.email);

  return {
    user,
    isAdmin,
    loading
  };
};
