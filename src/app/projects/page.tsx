'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalMin: string | null;
  createdAt: string;
  updatedAt: string;
  bomItems: { id: string; status: string }[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

useEffect(() => {
  supabase.auth.getSession().then(async ({ data }) => {
    const t = data.session?.access_token ?? null;
    setToken(t);
    if (!t) { router.push('/signin'); return; }
    // Synchroniser l'utilisateur d'abord
    await fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
    });
    loadProjects(t);
  });
}, []);

  const loadProjects = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  };

 const createProject = async () => {
  if (!newName.trim() || !token) return;
  setCreating(true);
  try {
    const res = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    const data = await res.json();
    if (data.id) {
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      await loadProjects(token);
    }
  } catch {}
  finally { setCreating(false); }
};

  const deleteProject = async (id: string) => {
    if (!token || !confirm('Supprimer ce projet ?')) return;
    await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/20',
    COMPLETED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    ARCHIVED: 'text-white/30 bg-white/5 border-white/10',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', COMPLETED: 'Complété', ARCHIVED: 'Archivé',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
      <NavBar />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Mes Projets</h1>
            <p className="text-white/40 text-sm mt-1">Gérez vos listes de matériaux et calculez le meilleur prix</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
          >
            + Nouveau projet
          </button>
        </div>

        {/* Formulaire création */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="font-black text-lg mb-4">Nouveau projet</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nom du projet (ex: Clôture arrière)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProject()}
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={createProject}
                  disabled={creating || !newName.trim()}
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white text-sm px-4">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white/40">Chargement...</p>
          </div>
        )}

        {/* Aucun projet */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-20">📋</div>
            <p className="text-white/30 mb-2">Aucun projet pour l'instant</p>
            <p className="text-white/20 text-sm">Créez votre premier projet pour commencer à comparer les prix</p>
          </div>
        )}

        {/* Liste des projets */}
        {!loading && projects.length > 0 && (
          <div className="flex flex-col gap-4">
            {projects.map(p => {
              const total = p.bomItems?.length ?? 0;
              const found = p.bomItems?.filter(i => i.status === 'FOUND').length ?? 0;
              const progress = total > 0 ? Math.round((found / total) * 100) : 0;

              return (
                <div key={p.id} className="group bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-3xl p-6 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-lg truncate">{p.name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColors[p.status] ?? statusColors.ACTIVE}`}>
                          {statusLabels[p.status] ?? p.status}
                        </span>
                      </div>
                      {p.description && <p className="text-white/40 text-sm mb-3">{p.description}</p>}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-white/30">
                        <span>📦 {total} item{total !== 1 ? 's' : ''}</span>
                        {p.totalMin && <span className="text-cyan-400 font-bold">Min: {Number(p.totalMin).toFixed(2)} $</span>}
                        <span>Modifié {new Date(p.updatedAt).toLocaleDateString('fr-CA')}</span>
                      </div>

                      {/* Barre de progression */}
                      {total > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                            <span>Prix trouvés</span>
                            <span>{found}/{total}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-violet-500 to-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/projects/${p.id}`}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
                      >
                        Ouvrir →
                      </Link>
                      <button
                        onClick={() => deleteProject(p.id)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/30 flex items-center justify-center transition-all text-sm"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 border-t border-white/10 px-6 flex justify-around items-center z-50 h-16">
        <Link href="/" className="flex flex-col items-center gap-1"><span className="text-xl">🏠</span><span className="text-[10px] text-white/40">Accueil</span></Link>
        <Link href="/search" className="flex flex-col items-center gap-1"><span className="text-xl">🔍</span><span className="text-[10px] text-white/40">Chercher</span></Link>
        <div className="flex flex-col items-center gap-1"><span className="text-xl">📋</span><span className="text-[10px] text-cyan-400">Projets</span></div>
        <Link href="/signin" className="flex flex-col items-center gap-1"><span className="text-xl">👤</span><span className="text-[10px] text-white/40">Profil</span></Link>
      </div>
    </div>
  );
}