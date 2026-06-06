import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Trash2, ArrowLeft, Bold, Italic, Underline, Image as ImageIcon, Eye, Edit3, Type, Calendar as CalendarIcon, Hash, FileDown } from 'lucide-react';
import { Article, Indexation } from '../types';
import { convertToDirectLink } from '../lib/utils';
import { saveArticle, removeArticle } from '../services/articleService';
import { auth } from '../firebase';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { toast } from 'sonner';

interface AdminEditorProps {
  articleToEdit?: Article | null;
  categories: { id: string, nom: string, ordre: number }[];
  articles?: Article[];
  onClose: () => void;
}

export default function AdminEditor({ articleToEdit, categories, articles = [], onClose }: AdminEditorProps) {
  const [titre, setTitre] = useState(articleToEdit?.titre || '');
  const [extrait, setExtrait] = useState(articleToEdit?.extrait || '');
  const [contenuComplet, setContenuComplet] = useState(articleToEdit?.contenuComplet || '');
  const [date, setDate] = useState(articleToEdit?.date || new Date().toISOString().split('T')[0]);
  const [dateAffichee, setDateAffichee] = useState(articleToEdit?.dateAffichee || '');
  const [pdfUrl, setPdfUrl] = useState(articleToEdit?.pdfUrl || '');
  const [indexations, setIndexations] = useState<Indexation[]>(articleToEdit?.indexations || []);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-generate dateAffichee if empty
  useEffect(() => {
    if (!dateAffichee && date) {
      const d = new Date(date);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      setDateAffichee(d.toLocaleDateString('fr-FR', options).toUpperCase());
    }
  }, [date, dateAffichee]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [titre, contenuComplet, extrait, date, dateAffichee, indexations]);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    setContenuComplet(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleAddIndex = () => {
    const defaultCat = categories.length > 0 ? categories[0].nom : 'Théorie';
    setIndexations([...indexations, { categorie: defaultCat as any, terme: '' }]);
  };

  const handleRemoveIndex = (index: number) => {
    setIndexations(indexations.filter((_, i) => i !== index));
  };

  const handleUpdateIndex = (index: number, field: keyof Indexation, value: string) => {
    const newIndexations = [...indexations];
    newIndexations[index] = { ...newIndexations[index], [field]: value };
    setIndexations(newIndexations);
  };

  const handleSave = async () => {
    if (!titre.trim() || !contenuComplet.trim()) {
      toast.error("Le titre et le contenu sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const articleData = {
        titre: titre.trim(),
        extrait: extrait.trim(),
        contenuComplet: contenuComplet.trim(),
        date,
        dateAffichee: dateAffichee.trim(),
        pdfUrl: pdfUrl.trim(),
        indexations,
        authorUid: auth.currentUser?.uid || 'admin'
      };

      await saveArticle({
        ...articleData,
        id: articleToEdit?.id
      });
      toast.success("Article enregistré avec succès !");
      onClose();
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      let errorMsg = "Erreur lors de la sauvegarde de l'article.";
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error === "Unauthorized") {
          errorMsg = "Erreur d'authentification : Mot de passe incorrect ou session expirée.";
        } else {
          errorMsg = `Erreur : ${parsedError.error}`;
        }
      } catch (e) {
        errorMsg = `Erreur : ${error.message || "Inconnue"}`;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!articleToEdit?.id) {
      console.error("Tentative de suppression sans ID d'article");
      return;
    }
    
    console.log("Suppression de l'article:", articleToEdit.id);
    setLoading(true);
    try {
      await removeArticle(articleToEdit.id);
      toast.success("Article supprimé avec succès.");
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
                {articleToEdit ? 'Édition' : 'Nouvelle Publication'}
              </h2>
              <p className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Socialisme ou Barbarie — Console Admin</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-white/10 p-1 rounded-sm mr-4">
              <button 
                onClick={() => setViewMode('edit')}
                className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                <Edit3 size={12} className="inline mr-2" /> Éditeur
              </button>
              <button 
                onClick={() => setViewMode('preview')}
                className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                <Eye size={12} className="inline mr-2" /> Aperçu
              </button>
            </div>

            {articleToEdit && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 transition-all rounded-sm font-bold text-[10px] uppercase tracking-widest"
                title="Supprimer définitivement"
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
              <Save size={18} /> {loading ? 'En cours...' : 'Publier'}
            </button>
          </div>
        </div>

      <div className="px-4 py-8 space-y-10">
        <AnimatePresence mode="wait">
          {viewMode === 'edit' ? (
            <motion.div 
              key="edit"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-10"
            >
              {/* Titre & Dates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                    <Type size={12} /> Titre de l'article
                  </label>
                  <input 
                    type="text" 
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    className="w-full text-4xl font-black uppercase tracking-tighter border-b-4 border-black/5 focus:border-red-600 outline-none py-2 transition-all placeholder:opacity-20"
                    placeholder="TITRE DE L'ARTICLE..."
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                      <CalendarIcon size={12} /> Date de publication
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border border-black/10 p-3 text-xs font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                      />
                      <input 
                        type="text" 
                        value={dateAffichee}
                        onChange={(e) => setDateAffichee(e.target.value)}
                        className="w-full border border-black/10 p-3 text-xs font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                        placeholder="12 MARS 2026"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                      <FileDown size={12} /> Lien PDF (Google Drive, etc.)
                    </label>
                    <input 
                      type="text" 
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      className="w-full border border-black/10 p-3 text-xs font-bold outline-none focus:border-red-600 bg-black/[0.02]"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Extrait */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-40">
                  <Edit3 size={12} /> Chapô / Introduction
                </label>
                <textarea 
                  value={extrait}
                  onChange={(e) => setExtrait(e.target.value)}
                  className="w-full border border-black/10 p-6 font-serif text-xl italic outline-none focus:border-red-600 h-32 bg-black/[0.01] leading-relaxed"
                  placeholder="Un court résumé accrocheur..."
                />
              </div>

              {/* Contenu Markdown */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                    <Edit3 size={12} /> Corps de l'article (Markdown)
                  </label>
                  
                  {/* Toolbar */}
                  <div className="flex gap-1 bg-black/5 p-1 rounded-sm">
                    <button 
                      onClick={() => insertText('**', '**')}
                      className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Gras"
                    >
                      <Bold size={14} />
                    </button>
                    <button 
                      onClick={() => insertText('*', '*')}
                      className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Italique"
                    >
                      <Italic size={14} />
                    </button>
                    <button 
                      onClick={() => insertText('<u>', '</u>')}
                      className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Souligné"
                    >
                      <Underline size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        const url = prompt("URL de l'image :");
                        if (url) {
                          const size = prompt("Largeur (ex: 50%, 300px, auto) :", "100%");
                          insertText(`<img src="${url}" alt="Image" style="width: ${size}; height: auto;" />`);
                        }
                      }}
                      className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Insérer une image externe"
                    >
                      <ImageIcon size={14} />
                    </button>
                    <div className="w-[1px] bg-black/10 mx-1"></div>
                    <button 
                      onClick={() => insertText('## ')}
                      className="px-2 text-[10px] font-bold hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Titre 2"
                    >
                      H2
                    </button>
                    <button 
                      onClick={() => insertText('> ')}
                      className="px-2 text-[10px] font-bold hover:bg-white hover:shadow-sm transition-all rounded-sm"
                      title="Citation"
                    >
                      "
                    </button>
                  </div>
                </div>
                
                <textarea 
                  ref={textareaRef}
                  value={contenuComplet}
                  onChange={(e) => setContenuComplet(e.target.value)}
                  className="w-full border border-black/10 p-8 font-mono text-sm outline-none focus:border-red-600 h-[600px] leading-relaxed bg-black/[0.01] resize-y"
                  placeholder="Écrivez votre article ici..."
                />
              </div>

              {/* Indexations */}
              <div className="pt-10 border-t-2 border-black/5">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                    <Hash size={14} /> Indexation & Archives
                  </h3>
                  <button 
                    onClick={handleAddIndex}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-red-600 transition-all active:scale-95"
                  >
                    <Plus size={14} /> Ajouter un tag
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {indexations.map((idx, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className="flex gap-2 items-center bg-black/[0.03] p-3 border border-black/5 group"
                    >
                      <select 
                        value={idx.categorie}
                        onChange={(e) => handleUpdateIndex(i, 'categorie', e.target.value)}
                        className="bg-white border border-black/10 p-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-red-600"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.nom}>{cat.nom}</option>
                        ))}
                        {categories.length === 0 && (
                          <>
                            <option value="International">International</option>
                            <option value="Université">Université</option>
                            <option value="Théorie">Théorie</option>
                            <option value="Organisations">Organisations</option>
                          </>
                        )}
                      </select>
                      <input 
                        type="text" 
                        value={idx.terme}
                        onChange={(e) => handleUpdateIndex(i, 'terme', e.target.value)}
                        className="flex-1 bg-white border border-black/10 p-2 text-xs font-bold outline-none focus:border-red-600"
                        placeholder="Terme d'index..."
                      />
                      <button 
                        onClick={() => handleRemoveIndex(i)}
                        className="p-2 text-black/20 hover:text-red-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </motion.div>
                  ))}
                  {indexations.length === 0 && (
                    <div className="col-span-2 py-12 border-2 border-dashed border-black/5 flex flex-col items-center justify-center opacity-30">
                      <Hash size={32} className="mb-2" />
                      <p className="text-[10px] uppercase tracking-widest font-bold">Aucun terme d'indexation défini.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="max-w-3xl mx-auto"
            >
              <div className="mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                  {dateAffichee || 'DATE NON DÉFINIE'}
                </span>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mt-4 mb-8">
                  {titre || 'SANS TITRE'}
                </h1>
                <p className="text-xl font-bold leading-relaxed mb-12 border-l-8 pl-8 border-red-600 italic font-serif">
                  {extrait || 'Aucun extrait défini.'}
                </p>
              </div>
              
              <div className="prose prose-lg max-w-none text-lg leading-relaxed text-black/80 markdown-preview">
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h2: ({ ...props }) => <h2 className="text-3xl font-black uppercase tracking-tighter mt-12 mb-6 border-b-2 border-black/5 pb-2" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-xl font-bold uppercase tracking-tight mt-8 mb-4" {...props} />,
                    blockquote: ({ ...props }) => (
                      <blockquote 
                        className="border-l-4 pl-6 py-4 my-8 italic font-serif text-xl bg-black/[0.02] relative border-[rgba(227,36,33,1)]"
                        {...props} 
                      />
                    ),
                    a: ({ href, children, ...props }: any) => {
                      if (href?.startsWith('article:')) {
                        const id = href.replace('article:', '');
                        const article = articles.find(a => String(a.id) === id);
                        return (
                          <span className="font-bold text-red-600 underline cursor-help" title={article ? `Lien vers: ${article.titre}` : "Article non trouvé"}>
                            {children}
                          </span>
                        );
                      }
                      return <a href={href} className="text-red-600 underline" {...props}>{children}</a>;
                    },
                    img: ({ src, alt, ...props }: any) => (
                      <img 
                        src={convertToDirectLink(src)} 
                        alt={alt} 
                        className="max-w-full h-auto my-12 border border-black/10 shadow-lg" 
                        referrerPolicy="no-referrer"
                        {...props} 
                      />
                    )
                  }}
                >
                  {contenuComplet || '*Aucun contenu à afficher.*'}
                </ReactMarkdown>
              </div>

              <div className="mt-20 pt-10 border-t border-black/10">
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-40">Indexation :</h3>
                <div className="flex flex-wrap gap-2">
                  {indexations.map((idx, i) => (
                    <span key={i} className="px-3 py-1 bg-black text-white text-[9px] font-bold uppercase tracking-widest">
                      {idx.categorie} : {idx.terme}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </motion.div>

      {/* Confirmation de suppression */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-10 max-w-md w-full shadow-2xl border-t-8 border-red-600"
            >
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Confirmer la suppression</h3>
              <p className="text-lg font-serif italic mb-8 text-black/60">
                Êtes-vous sûr de vouloir supprimer définitivement cet article ? Cette action est irréversible et le contenu sera perdu.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-4 font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Suppression...' : 'Oui, supprimer définitivement'}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
