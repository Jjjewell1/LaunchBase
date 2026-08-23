import React, { useEffect, useState } from 'react';
import { Database, Server, Cloud, Zap, Layout, Shield } from 'lucide-react';

import './index.css';

const DashboardApp = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apps', {
        credentials: 'include',
      });
      const data = await res.json();
      setApps(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (e) => {
    e.preventDefault();
    const secret = prompt('Enter sync secret:');
    if (!secret) return;
    try {
      await fetch('/api/sync/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
        credentials: 'include',
      });
      fetchApps();
    } catch (err) {
      alert('Sync failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen p-8">Error: {error}</div>;
  }

  // Group apps by source
  const grouped = {
    coolify: apps.filter(a => a.source === 'coolify'),
    coolifyService: apps.filter(a => a.source === 'coolify-service'),
    coolifyDatabase: apps.filter(a => a.source === 'coolify-database'),
    cloudflare: apps.filter(a => a.source === 'cloudflare'),
    unraid: apps.filter(a => a.source === 'unraid'),
  };

  // Icon mapping by source
  const sourceIcons = {
    coolify: <Database className="w-6 h-6 text-primary" />,
    coolifyService: <Server className="w-6 h-6 text-primary" />,
    coolifyDatabase: <Database className="w-6 h-6 text-primary" />,
    cloudflare: <Cloud className="w-6 h-6 text-primary" />,
    unraid: <Zap className="w-6 h-6 text-primary" />,
  };

  return (
    <div className="min-h-screen bg-background font-background text-foreground">
      <nav class="glass-nav fixed top-0 left-0 right-0 z-50 border-b border-border">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" class="font-medium tracking-tighter text-lg">
            <span class="gradient-accent">LaunchBase</span>
          </a>
          <ul class="hidden md:flex items-center gap-6">
            <li><a href="#features" class="relative text-sm font-medium hover:text-primary transition-colors">Features</a></li>
            <li><a href="#about" class="relative text-sm font-medium hover:text-primary transition-colors">About</a></li>
          </ul>
          <div class="flex items-center gap-3">
            <button class="glass-card px-4 py-2 text-sm font-medium rounded-full border border-border hover:border-primary transition-colors">
              Get Started
            </button>
            <button
              onClick={handleSync}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Sync Now
            </button>
          </div>
        </div>
      </nav>

      <main class="pt-32 md:pt-48 lg:pt-64">
        <section class="py-24 bg-card/80">
          <div class="max-w-7xl mx-auto px-6">
            <h1 class="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight tracking-tight gradient-accent mb-6">
              Manage your <br />
              <span class="block">homelab</span>
            </h1>
            <p class="text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground leading-relaxed mb-8">
              A unified dashboard for Cloudflare tunnels, Coolify services, and Unraid containers.
            </p>
          </div>
        </section>

        <section id="features" class="py-24 relative">
          <div class="max-w-7xl mx-auto px-6">
            <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight gradient-accent mb-12 text-center">Features</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Unraid Integration</h3>
                <p class="text-muted-foreground leading-relaxed">
                  Discover and monitor all your Docker containers via SSH. Pull names, images, ports, and running status automatically.
                </p>
              </article>

              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Server className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Coolify API</h3>
                <p class="text-muted-foreground leading-relaxed">
                  List applications, services, and databases from your Coolify instance. Full Bearer token authentication.
                </p>
              </article>

              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Cloudflare Tunnels</h3>
                <p class="text-muted-foreground leading-relaxed">
                  Poll Cloudflare tunnel configurations for ingress rules. Get hostname to service mappings automatically.
                </p>
              </article>

              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Auto-Discovery</h3>
                <p class="text-muted-foreground leading-relaxed">
                  Scheduled sync with configurable intervals. Inbound webhook endpoint to trigger instant resync on new app deployments.
                </p>
              </article>

              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Layout className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Smart Card Layout</h3>
                <p class="text-muted-foreground leading-relaxed">
                  Group cards by source, search/filter, hide/unhide, reorder via drag — all preferences persist locally.
                </p>
              </article>

              <article class="glass-card hover-lift rounded-xl p-8">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 class="font-bold text-xl mb-3">Secure by Design</h3>
                <p class="text-muted-foreground leading-relaxed">
                  All credentials stored in .env. Scoped API tokens. Webhook protected by shared secret.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="about" class="py-24 bg-card/80">
          <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight gradient-accent mb-6">Built for <span class="italic">your</span> homelab</h2>
              <p class="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                Pull apps from Cloudflare, Coolify, and Unraid into one dashboard. Auto-discovery pulls new apps automatically. Schedule syncs or trigger them via webhook.
              </p>
              <ul class="space-y-4 text-muted-foreground">
                <li class="flex items-start gap-3">
                  <span class="text-primary flex-shrink-0">
                    <i dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.21L2 9.23l6.9-1.21L12 2z"/></svg>' }} />
                  </span>
                  <span>Real-time status cards with online/offline indicators</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-primary flex-shrink-0">
                    <i dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 22c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' }} />
                  </span>
                  <span>Self-hosted icons from homarr-labs/dashboard-icons</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-primary flex-shrink-0">
                    <i dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 22c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' }} />
                  </span>
                  <span>Drag to reorder, hide, or rename cards</span>
                </li>
              </ul>
            </div>
            <div class="relative">
              <div class="relative">
                <img
                  src="https://images.unsplash.com/photo-1618709268585-8637d597a195e8f3?w=600&h=400&fit=crop&q=80"
                  alt="Dashboard mockup"
                  class="w-full h-64 object-cover rounded-2xl"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-80 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardApp;