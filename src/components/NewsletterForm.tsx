import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeNewsletter } from '../services/newsletterService';
import { toast } from 'sonner';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error("Veuillez entrer un email valide");
      return;
    }

    setLoading(true);
    try {
      const res = await subscribeNewsletter(email.trim());
      if (res?.success) {
        setSuccess(true);
        setEmail('');
        toast.success(res.message || "Inscription réussie !");
      }
    } catch (err) {
      toast.error("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[280px]">
      <div className="text-[10px] uppercase font-black tracking-[0.2em] mb-4 text-center">
        Newsletter
      </div>
      
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 text-green-600 bg-green-50 p-4 border border-green-200"
          >
            <CheckCircle size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-center">Inscrit avec succès !</span>
            <button 
              onClick={() => setSuccess(false)}
              className="text-[9px] underline uppercase tracking-tighter mt-1 opacity-60"
            >
              Réinitialiser
            </button>
          </motion.div>
        ) : (
          <motion.form 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
          >
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse email"
                disabled={loading}
                className="w-full p-3 border border-black text-[11px] font-bold uppercase tracking-widest outline-none focus:border-red-600 transition-all placeholder:italic placeholder:opacity-30 text-center"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-black text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-2 border-black hover:border-red-600"
            >
              {loading ? 'CHARGEMENT...' : 'S\'ABONNER'}
            </button>

          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
