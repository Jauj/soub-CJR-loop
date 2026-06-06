import { useState } from 'react';
import { Trash2, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { removeSubscriber } from '../services/newsletterService';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';

export default function NewsletterAdmin() {
  const { subscribers, loadAdminData, adminLoading } = useAppData();
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAdminData();
    setIsRefreshing(false);
    toast.success("Liste mise à jour");
  };

  const handleDeleteSub = async (id: string) => {
    if (confirm("Supprimer cet abonné ?")) {
      try {
        await removeSubscriber(id);
        toast.info("Abonné supprimé");
        loadAdminData();
      } catch (err) {
        toast.error("Erreur de suppression");
      }
    }
  };

  const copyAllEmails = () => {
    const emails = subscribers.map(s => s.email).join(', ');
    if (!emails) {
      toast.error("Aucun abonné à copier");
      return;
    }
    navigator.clipboard.writeText(emails);
    setIsCopyingAll(true);
    toast.success("Toutes les adresses ont été copiées");
    setTimeout(() => setIsCopyingAll(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter">Liste des Abonnés</h3>
          <p className="font-serif italic text-black/50">Gérez les inscriptions à votre lettre d'information.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing || adminLoading}
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all disabled:opacity-50"
          >
            {isRefreshing ? "Chargement..." : "Rafraîchir"}
          </button>
          
          <button 
            onClick={copyAllEmails}
            className={`flex items-center justify-center gap-3 px-8 py-4 border-2 border-black text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isCopyingAll ? 'bg-green-600 text-white border-green-600' : 'bg-black text-white hover:bg-white hover:text-black'}`}
          >
            {isCopyingAll ? (
              <><Check size={16} /> Copié !</>
            ) : (
              <><Copy size={16} /> Copier les emails</>
            )}
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-black overflow-hidden"
      >
        <div className="bg-black/5 p-4 border-b-2 border-black flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Base de données abonnés</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{subscribers.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-black text-[10px] font-black uppercase tracking-[0.3em]">
              <tr>
                <th className="p-5">Email</th>
                <th className="p-5 hidden sm:table-cell">Date d'inscription</th>
                <th className="p-5 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 text-xs font-bold font-mono">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-20 text-center italic opacity-30 font-serif text-lg tracking-normal">
                    La liste des abonnés est vide.
                  </td>
                </tr>
              ) : (
                subscribers.map(sub => (
                  <tr key={sub.id} className="hover:bg-black/[0.01] transition-colors group">
                    <td className="p-5 text-sm">{sub.email}</td>
                    <td className="p-5 opacity-40 hidden sm:table-cell font-sans">
                      {new Date(sub.dateInscription).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => handleDeleteSub(sub.id!)}
                        title="Désabonner"
                        className="p-3 text-black/20 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="p-6 bg-red-50 border-2 border-red-600/20 text-red-900 text-xs leading-relaxed font-medium">
        <strong className="block uppercase tracking-widest mb-2 font-black">Conseil d'utilisation</strong>
        Pour envoyer votre newsletter, utilisez le bouton "Copier tous les emails" ci-dessus et collez la liste dans le champ <strong>BCC (Cci)</strong> de votre client mail habituel. Cela permet d'envoyer un message groupé sans exposer les adresses des abonnés entre eux.
      </div>
    </div>
  );
}
