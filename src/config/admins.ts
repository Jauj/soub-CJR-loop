import type { User } from 'firebase/auth';

/**
 * Comptes administrateurs côté client (affichage de l'admin, garde-fous des services).
 * La véritable protection est dans firestore.rules (fonction isAdmin) : toute
 * modification de cette liste doit y être reportée.
 */
export const ADMIN_EMAILS = ["ferrierjonas@gmail.com", "cjr.soub@gmail.com", "admin@cjr.fr"];

/** Compte e-mail/mot de passe partagé, accepté sans vérification d'e-mail. */
const SHARED_ADMIN_EMAIL = "admin@cjr.fr";

export const isAdminUser = (user: User | null | undefined): boolean =>
  !!user?.email &&
  (user.emailVerified || user.email === SHARED_ADMIN_EMAIL) &&
  ADMIN_EMAILS.includes(user.email);
