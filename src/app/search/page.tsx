'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import NavBar from '@/src/components/NavBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating';

interface Project { id: string; name: string; }

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [lastQuery, setLastQuery] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState<number | null>(null);
  const suggestTimeout = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (!t) return;
      await fetch(`${API_URL}/users/sync`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
      const res = await fetch(`${API_URL}/projects/me`, { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      setProjects(Array.isArray(d) ? d : []);
    });
  }, []);

  // Fermer le menu si clic à l'extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuIdx(null);
        setShowNewProject(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    suggestTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/search/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch { setSuggestions([]); }
    }, 300);
  }, [query]);

  const handleSearch = async (q?: string, s?: SortOption) => {
    const searchQuery = q ?? query;
    const sortBy = s ?? sort;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLastQuery(searchQuery);
    setShowSuggestions(false);
    setLoading(true);
    setHasSearched(true);
    setProducts([]);
    setOpenMenuIdx(null);
    try {
      const res = await fetch(`${API_URL}/search/shopping?q=${encodeURIComponent(searchQuery)}&sort=${sortBy}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    if (hasSearched && lastQuery) handleSearch(lastQuery, newSort);
  };

  const addToProject = async (p: any, projectId: string, projectName: string) => {
    if (!token) return;
    setActionLoading(`project-${projectId}`);
    try {
      await fetch(`${API_URL}/projects/${projectId}/bom`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.title,
          quantity: 1,
          imageUrl: p.thumbnail,
        }),
      });
      showToast(`✅ Ajouté au projet "${projectName}"`);
      setOpenMenuIdx(null);
    } catch {
      showToast('❌ Erreur lors de l\'ajout');
    } finally {
      setActionLoading(null);
    }
  };

  const createProjectAndAdd = async (p: any, idx: number) => {
    if (!token || !newProjectName.trim()) return;
    setActionLoading('new-project');
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const project = await res.json();
      if (project.id) {
        setProjects(prev => [...prev, { id: project.id, name: project.name }]);
        await addToProject(p, project.id, project.name);
        setNewProjectName('');
        setShowNewProject(null);
      }
    } catch {
      showToast('❌ Erreur lors de la création');
    } finally {
      setActionLoading(null);
    }
  };

  const addToWatchlist = async (p: any) => {
    if (!token) return;
    setActionLoading('watchlist');
    try {
      await fetch(`${API_URL}/watchlist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.title,
          currentPrice: p.priceNum,
          currentMerchant: p.merchant,
          imageUrl: p.thumbnail,
          productUrl: p.link,
        }),
      });
      showToast('👁 Ajouté à la Watchlist');
      setOpenMenuIdx(null);
    } catch {
      showToast('❌ Erreur lors de l\'ajout');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#13131a] border border-white/20 rounded-2xl px-6 py-3 text-sm font-bold shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      <NavBar />

      <section className="relative">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Trouvez le <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">meilleur prix</span>
          </h1>
          <p className="text-white/40 mb-8">Prix en temps réel de tous les marchands canadiens.</p>
          <div className="max-w-2xl mx-auto relative">
            <div className="relative">
              <input type="text" placeholder="Perceuse Dewalt, TV Samsung..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-32 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-all text-sm" value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button onClick={() => handleSearch()} disabled={loading} className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-violet-600 to-cyan-600 disabled:opacity-50 text-white px-5 rounded-xl font-bold text-sm">{loading ? '...' : 'Comparer'}</button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#13131a] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                {suggestions.slice(0, 6).map((s, i) => (<button key={i} className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/5" onMouseDown={() => handleSearch(s)}>{s}</button>))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Perceuse Dewalt', 'TV 55 pouces', '2x4 8 pieds', 'iPhone 15'].map(s => (<button key={s} onClick={() => handleSearch(s)} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white text-sm">{s}</button>))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        {loading && (<div className="text-center py-20"><div className="inline-block w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" /><p className="text-white/40">Recherche en cours...</p></div>)}
        {!loading && hasSearched && products.length === 0 && (<div className="text-center py-20"><p className="text-white/30">Aucun résultat pour "{lastQuery}"</p></div>)}
        {products.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <p className="text-white/40 text-sm"><span className="text-white font-bold">{products.length}</span> résultats pour <span className="text-violet-400 font-bold">"{lastQuery}"</span></p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">Trier :</span>
                {([['relevance','Pertinence'],['price_asc','Prix ↑'],['price_desc','Prix ↓'],['rating','Avis']] as [SortOption,string][]).map(([v,l]) => (<button key={v} onClick={() => handleSortChange(v)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sort===v?'bg-violet-600 text-white':'bg-white/5 text-white/40 hover:text-white'}`}>{l}</button>))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
              {products.map((p, i) => (
                <div key={i} className="relative group">
                  {/* Bouton + */}
                  {token && (
                    <button
                      onClick={e => { e.preventDefault(); setOpenMenuIdx(openMenuIdx === i ? null : i); setShowNewProject(null); setNewProjectName(''); }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-black text-sm flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      +
                    </button>
                  )}

                  {/* Menu déroulant */}
                  {openMenuIdx === i && (
                    <div ref={menuRef} className="absolute top-10 right-2 z-20 bg-[#13131a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden w-52">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-xs text-white/40 font-bold truncate">{p.title.slice(0, 30)}...</p>
                      </div>

                      {/* Watchlist */}
                      <button
                        onClick={() => addToWatchlist(p)}
                        disabled={actionLoading === 'watchlist'}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-cyan-400 font-bold"
                      >
                        <span>👁</span> {actionLoading === 'watchlist' ? 'Ajout...' : 'Watchlist'}
                      </button>

                      <div className="border-t border-white/10" />

                      {/* Projets existants */}
                      {projects.length > 0 && (
                        <>
                          <p className="px-3 py-1.5 text-[10px] text-white/30 font-bold uppercase tracking-wider">Ajouter au projet</p>
                          {projects.map(proj => (
                            <button
                              key={proj.id}
                              onClick={() => addToProject(p, proj.id, proj.name)}
                              disabled={actionLoading === `project-${proj.id}`}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2 text-white/70"
                            >
                              <span>📋</span>
                              <span className="truncate">{actionLoading === `project-${proj.id}` ? 'Ajout...' : proj.name}</span>
                            </button>
                          ))}
                          <div className="border-t border-white/10" />
                        </>
                      )}

                      {/* Nouveau projet */}
                      {showNewProject === i ? (
                        <div className="p-2 flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Nom du projet"
                            className="w-full bg-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500 border border-white/10"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createProjectAndAdd(p, i)}
                            autoFocus
                          />
                          <button
                            onClick={() => createProjectAndAdd(p, i)}
                            disabled={!newProjectName.trim() || actionLoading === 'new-project'}
                            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-xl"
                          >
                            {actionLoading === 'new-project' ? 'Création...' : 'Créer et ajouter'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewProject(i)}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-violet-400 font-bold"
                        >
                          <span>➕</span> Nouveau projet
                        </button>
                      )}
                    </div>
                  )}

                  {/* Carte produit */}
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-3xl p-4 flex flex-col gap-3 hover:-translate-y-1 transition-all block">
                    <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center p-2">{p.thumbnail?(<img src={p.thumbnail} alt={p.title} className="max-w-full max-h-full object-contain" />):(<span className="text-3xl">📦</span>)}</div>
                    <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full self-start truncate max-w-full">{p.merchant}</span>
                    <p className="text-xs font-medium text-white/80 line-clamp-2">{p.title}</p>
                    <p className="text-lg font-black text-white">{p.price ?? '—'}</p>
                    {p.rating && (<div className="flex items-center gap-1"><span className="text-amber-400 text-xs">{'★'.repeat(Math.round(p.rating))}</span><span className="text-xs text-white/30">({p.reviews})</span></div>)}
                    {p.delivery && (<p className="text-xs text-green-400">{p.delivery}</p>)}
                    <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 mt-auto">Acheter →</span>
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>


    </div>
  );
}