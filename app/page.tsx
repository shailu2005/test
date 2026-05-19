'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LoveApp = dynamic(() => import('@/components/LoveApp'), { ssr: false });

export default function Home() {
  const [user, setUser] = useState<'shailu' | 'bhavi' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('loveapp_user');
    if (saved === 'shailu' || saved === 'bhavi') setUser(saved);
  }, []);

  if (!mounted) return null;

  if (!user) {
    return <LoginScreen onLogin={(u) => {
      localStorage.setItem('loveapp_user', u);
      setUser(u);
    }} />;
  }

  return <LoveApp currentUser={user} onLogout={() => {
    localStorage.removeItem('loveapp_user');
    setUser(null);
  }} />;
}

function LoginScreen({ onLogin }: { onLogin: (u: 'shailu' | 'bhavi') => void }) {
  const [petals] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      emoji: ['🌸', '🌺', '💮', '🌹', '💐'][Math.floor(Math.random() * 5)],
    }))
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fde8ee 0%, #fdf6f0 50%, #fce7f3 100%)' }}>
      
      {/* Floating petals */}
      {petals.map(p => (
        <div key={p.id} className="petal select-none" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          fontSize: '1.4rem',
        }}>{p.emoji}</div>
      ))}

      <div className="relative z-10 text-center px-6">
        {/* Stars */}
        {[...Array(6)].map((_, i) => (
          <span key={i} className="twinkle absolute text-yellow-300 select-none" style={{
            top: `${-40 + Math.random() * 80}px`,
            left: `${-60 + Math.random() * 120 + (i * 60)}px`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${2 + i * 0.3}s`,
            fontSize: `${0.8 + Math.random() * 0.6}rem`,
          }}>✦</span>
        ))}

        <div className="heartbeat text-7xl mb-4 select-none">💕</div>
        
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-2" 
          style={{ color: '#7c2d44' }}>
          Our Little World
        </h1>
        <p className="font-body text-lg mb-2" style={{ color: '#c084a0' }}>
          Shailu & Madam's cozy corner 🌸
        </p>
        <p className="font-body text-sm mb-10" style={{ color: '#c084a0' }}>
          Together since Jan 20, 2026 ✨
        </p>

        <p className="font-display italic text-xl mb-6" style={{ color: '#9f1239' }}>
          Who are you, love?
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <button onClick={() => onLogin('shailu')}
            className="group relative px-8 py-4 rounded-2xl font-display text-white text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 8px 24px rgba(244,63,94,0.35)' }}>
            <span className="text-2xl mr-2">👦</span> I'm Shailu
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
          
          <button onClick={() => onLogin('bhavi')}
            className="group relative px-8 py-4 rounded-2xl font-display text-white text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', boxShadow: '0 8px 24px rgba(236,72,153,0.35)' }}>
            <span className="text-2xl mr-2">👩</span> I'm Madam 👑
            <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
        </div>

        <p className="mt-8 text-xs" style={{ color: '#c084a0' }}>
          🔒 Just for us, always
        </p>
      </div>
    </div>
  );
}
