import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ExternalLink, EyeOff, Eye } from 'lucide-react';
import './index.css';

const SOURCE_META = {
  coolify: { label: 'Apps', order: 0 },
  'coolify-service': { label: 'Services', order: 1 },
  'coolify-database': { label: 'Databases', order: 2 },
  cloudflare: { label: 'Tunnel Hostnames', order: 3 },
  unraid: { label: 'Unraid Containers', order: 4 },
};

function AppIcon({ app }) {
  const [failed, setFailed] = useState(false);
  const slug = app.icon && app.icon !== 'default' ? app.icon : null;

  if (!slug || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
        {(app.name || '?').charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={`/api/icons/${slug}.svg`}
      alt=""
      className="w-10 h-10 p-1.5 flex-shrink-0"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const DashboardApp = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState(null);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      if (!res.ok) throw new Error(`API ${res.status}`);
      setApps(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setHidden = async (app, hidden) => {
    setApps(prev => prev.map(a => (a.id === app.id ? { ...a, hidden: hidden ? 1 : 0 } : a)));
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
    } catch (err) {
      alert('Could not update app: ' + err.message);
      fetchApps();
    }
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    const secret = prompt('Enter sync secret:');
    if (!secret) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      if (res.status === 403) {
        alert('Sync failed: invalid secret');
        return;
      }
      if (!res.ok) {
        alert('Sync failed: server error ' + res.status);
        return;
      }
      await fetchApps();
      alert('Sync complete — dashboard updated');
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? apps.filter(a => a.name.toLowerCase().includes(q)) : apps;
  }, [apps, query]);

  const visibleApps = useMemo(() => filtered.filter(a => !a.hidden), [filtered]);
  const hiddenApps = useMemo(() => filtered.filter(a => a.hidden), [filtered]);
  const hiddenCount = useMemo(() => apps.filter(a => a.hidden).length, [apps]);

  const sections = useMemo(() => {
    const bySource = new Map();
    for (const app of visibleApps) {
      if (!bySource.has(app.source)) bySource.set(app.source, []);
      bySource.get(app.source).push(app);
    }
    return [...bySource.entries()]
      .sort((a, b) =>
        (SOURCE_META[a[0]]?.order ?? 99) - (SOURCE_META[b[0]]?.order ?? 99))
      .map(([source, items]) => ({
        source,
        label: SOURCE_META[source]?.label || source,
        items,
      }));
  }, [visibleApps]);

  const total = visibleApps.length;

  return (
    <div className="min-h-screen">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <a href="#" className="font-medium tracking-tighter text-lg whitespace-nowrap">
            <span className="gradient-accent">LaunchBase</span>
          </a>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${total} apps...`}
              className="w-full glass-card rounded-full pl-9 pr-4 py-2 text-sm bg-transparent outline-none focus:border-primary/50 placeholder:text-muted"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(v => !v)}
              title={`${hiddenCount} hidden`}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${showHidden ? 'bg-primary/20 text-primary' : 'text-muted hover:text-foreground'}`}
            >
              <Eye className="w-4 h-4" />
              {hiddenCount}
            </button>
          )}
        </div>
      </nav>

      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        {loading && <p className="text-muted text-center py-24">Loading apps...</p>}

        {!loading && error && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-red-400 mb-2">Couldn't reach the API: {error}</p>
            <button onClick={fetchApps} className="text-primary hover:underline text-sm">Retry</button>
          </div>
        )}

        {!loading && !error && total === 0 && hiddenApps.length > 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <h2 className="text-xl font-bold mb-2">All apps hidden</h2>
            <p className="text-muted">Use the eye button in the header to bring them back.</p>
          </div>
        )}

        {!loading && !error && total === 0 && hiddenApps.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <h2 className="text-xl font-bold mb-2">No apps yet</h2>
            <p className="text-muted mb-6">
              Hit <span className="text-primary font-medium">Sync Now</span> and enter the sync secret to pull in
              your Coolify apps, Cloudflare tunnels, and Unraid containers.
            </p>
          </div>
        )}

        {!loading && !error && total > 0 && visibleApps.length === 0 && (
          <p className="text-muted text-center py-24">No apps match "{query}"</p>
        )}

        <div className="space-y-12">
          {sections.map(({ source, label, items }) => (
            <section key={source}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-lg font-bold tracking-tight">{label}</h2>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(app => (
                  <div
                    key={app.id}
                    className="glass-card hover-lift rounded-xl p-5 flex items-start gap-3 group relative"
                  >
                    <button
                      onClick={() => setHidden(app, true)}
                      title="Hide this app"
                      className="absolute top-2 right-2 p-1.5 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                    <a href={app.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 min-w-0 flex-1">
                      <AppIcon app={app} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 pr-5">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${app.status === 'online' ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                          />
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {app.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted truncate mt-1">
                          {app.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {showHidden && hiddenApps.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-lg font-bold tracking-tight text-muted">Hidden</h2>
                <span className="text-xs text-muted">{hiddenApps.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-60">
                {hiddenApps.map(app => (
                  <div
                    key={app.id}
                    className="glass-card rounded-xl p-5 flex items-start gap-3 group relative"
                  >
                    <button
                      onClick={() => setHidden(app, false)}
                      title="Unhide this app"
                      className="absolute top-2 right-2 p-1.5 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-white/5 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <AppIcon app={app} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{app.name}</h3>
                      <p className="text-xs text-muted truncate mt-1">
                        {app.url.replace(/^https?:\/\//, '')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardApp;
