import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Trash2, ArrowLeft, Type, Calendar as CalendarIcon, Link as LinkIcon, Hash, ImageIcon, FileText, Info } from 'lucide-react';
import { Bulletin } from '../types';
import { convertToDirectLink } from '../lib/utils';
import { saveBulletin, removeBulletin } from '../services/bulletinService';
import { toast } from 'sonner';

interface BulletinEditorProps {
  bulletinToEdit?: Bulletin | null;
  onClose: () => void;
}

export default function BulletinEditor({ bulletinToEdit, onClose }: BulletinEditorProps) {
  const [numero, setNumero] = useState(bulletinToEdit?.numero || '');
  const [titre, setTitre] = useState(bulletinToEdit?.titre || '');
  const [date, setDate] = useState(bulletinToEdit?.date || '');
  const [couvertureUrl, setCouvertureUrl] = useState(bulletinToEdit?.couvertureUrl || '');
  const [pdfUrl, setPdfUrl] = useState(bulletinToEdit?.pdfUrl || '');
  const [ordre, setOrdre] = useState(bulletinToEdit?.ordre || 0);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!numero.trim() || !date.trim() || !couvertureUrl.trim() || !pdfUrl.trim()) {
      toast.error("Tous les champs obligatoires doivent être remplis.");
      return;
    }

    setLoading(true);
    try {
      const bulletinData: Bulletin = {
        numero: numero.trim(),
        titre: titre.trim(),
        date: date.trim(),
        couvertureUrl: couvertureUrl.trim(),
        pdfUrl: pdfUrl.trim(),
        ordre: Number(ordre)
      };

      await saveBulletin({
        ...bulletinData,
        id: bulletinToEdit?.id
      });
      toast.success("Bulletin enregistré avec succès !");
      onClose();
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde du bulletin.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bulletinToEdit?.id) return;
    
    setLoading(true);
    try {
      await removeBulletin(bulletinToEdit.id);
      toast.success("Bulletin supprimé avec succès.");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full min-h-screen bg-white overflow-hidden"
      >
        {/* Header */}
        <div className="bg-black text-white px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="hover:text-red-500 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {bulletinToEdit ? 'Édition Bulletin' : 'Nouveau Bulletin'}
              </h2>
              <p className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Socialisme ou Barbarie — Console Admin</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {bulletinToEdit && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 transition-all rounded-sm font-bold text-[10px] uppercase tracking-widest"
              >
                <Trash2 size={16} />
                <span>Supprimer</span>
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-red-600 text-white px-8 py-2 font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Save size={18} /> {loading ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="px-4 py-8 max-w-4xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Formulaire */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <Hash size={12} /> Numéro du bulletin
                </label>
                <input 
                  type="text" 
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                  placeholder="Ex: 1, 2, Spécial..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <Type size={12} /> Titre (Optionnel)
                </label>
                <input 
                  type="text" 
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                  placeholder="Titre du numéro..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <CalendarIcon size={12} /> Date de parution
                </label>
                <input 
                  type="text" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                  placeholder="Ex: Janvier 1949"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <ImageIcon size={12} /> Image de couverture
                </label>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={couvertureUrl}
                    onChange={(e) => setCouvertureUrl(e.target.value)}
                    className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                    placeholder="URL de l'image (Google Drive accepté)..."
                  />
                  <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-sm">
                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] leading-relaxed">
                      <strong>Astuce Google Drive :</strong> Copiez le lien de partage (en mode "Tous les utilisateurs disposant du lien"). L'application le convertira automatiquement pour l'affichage.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <FileText size={12} /> URL du fichier PDF
                </label>
                <input 
                  type="text" 
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <Hash size={12} /> Ordre d'affichage (plus élevé = en premier)
                </label>
                <input 
                  type="number" 
                  value={ordre}
                  onChange={(e) => setOrdre(Number(e.target.value))}
                  className="w-full border border-black/10 p-3 text-sm font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                />
              </div>
            </div>

            {/* Aperçu */}
            <div className="flex flex-col items-center justify-center p-8 bg-black/[0.02] border-2 border-dashed border-black/10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-40">Aperçu de la couverture</h3>
              {couvertureUrl ? (
                <div className="relative group">
                  <img 
                    key={convertToDirectLink(couvertureUrl)}
                    src={convertToDirectLink(couvertureUrl)} 
                    alt="Aperçu" 
                    className="w-64 h-auto shadow-2xl border border-black/10 transition-all duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('placeholder')) {
                        target.src = 'https://placehold.co/300x400?text=Image+Non+Trouvée';
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center">
                    <span className="text-xs font-bold uppercase tracking-widest mb-2">N° {numero}</span>
                    <span className="text-[10px] italic font-serif">{date}</span>
                  </div>
                </div>
              ) : (
                <div className="w-64 h-80 bg-black/5 flex items-center justify-center text-black/20">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6">
          <div className="bg-white p-10 max-w-md w-full shadow-2xl border-t-8 border-red-600 text-center">
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Supprimer ce bulletin ?</h3>
            <p className="text-lg font-serif italic mb-8 text-black/60">
              Cette action est irréversible.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Confirmer la suppression
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
