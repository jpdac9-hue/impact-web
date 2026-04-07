'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sort, setSort] = useState<SortOption>('relevance');
  const [lastQuery, setLastQuery] = useState('');
  const suggestTimeout = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Suric" className="h-15 w-15 rounded-full" />
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent leading-none">SURIC</span>
              <span className="text-[10px] text-white/30 font-medium leading-none">Scan. Compare. Save.</span>
            </div>
          </Link>
          <Link href="/signin" className="text-sm font-medium text-white/50 hover:text-white transition">Mon Espace</Link>
        </div>
      </nav>
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
                <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="group bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-3xl p-4 flex flex-col gap-3 hover:-translate-y-1 transition-all">
                  <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center p-2">{p.thumbnail?(<img src={p.thumbnail} alt={p.title} className="max-w-full max-h-full object-contain" />):(<span className="text-3xl">📦</span>)}</div>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full self-start truncate max-w-full">{p.merchant}</span>
                  <p className="text-xs font-medium text-white/80 line-clamp-2">{p.title}</p>
                  <p className="text-lg font-black text-white">{p.price ?? '—'}</p>
                  {p.rating && (<div className="flex items-center gap-1"><span className="text-amber-400 text-xs">{'★'.repeat(Math.round(p.rating))}</span><span className="text-xs text-white/30">({p.reviews})</span></div>)}
                  {p.delivery && (<p className="text-xs text-green-400">{p.delivery}</p>)}
                  <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 mt-auto">Acheter →</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 border-t border-white/10 px-6 flex justify-around items-center z-50 h-16">
        <Link href="/" className="flex flex-col items-center gap-1"><span className="text-xl">🏠</span><span className="text-[10px] text-white/40">Accueil</span></Link>
        <div className="flex flex-col items-center gap-1"><span className="text-xl">🔍</span><span className="text-[10px] text-cyan-400">Chercher</span></div>
        <Link href="/projects" className="flex flex-col items-center gap-1"><span className="text-xl">📋</span><span className="text-[10px] text-white/40">Projets</span></Link>
        <Link href="/signin" className="flex flex-col items-center gap-1"><span className="text-xl">👤</span><span className="text-[10px] text-white/40">Profil</span></Link>
      </div>
    </div>
  );
}
