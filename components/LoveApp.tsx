'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { ref, set, onValue, push, serverTimestamp, update } from 'firebase/database';
import { formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
type User = 'shailu' | 'bhavi';

interface Mood {
  emoji: string;
  label: string;
  color: string;
}

interface Message {
  id: string;
  from: User;
  text: string;
  type: 'text' | 'hug' | 'kiss' | 'letter' | 'song';
  timestamp: number;
  reaction?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  city: string;
  timestamp: number;
  user: User;
}

interface Memory {
  id: string;
  title: string;
  note: string;
  emoji: string;
  date: string;
  from: User;
  timestamp: number;
}

interface Wishlist {
  id: string;
  item: string;
  from: User;
  done: boolean;
  timestamp: number;
}

const MOODS: Mood[] = [
  { emoji: '🥰', label: 'Smitten', color: '#f43f5e' },
  { emoji: '😊', label: 'Happy', color: '#f59e0b' },
  { emoji: '🌸', label: 'Soft', color: '#ec4899' },
  { emoji: '😴', label: 'Sleepy', color: '#8b5cf6' },
  { emoji: '🥺', label: 'Missing you', color: '#3b82f6' },
  { emoji: '😔', label: 'Sad', color: '#6b7280' },
  { emoji: '😤', label: 'Grumpy', color: '#ef4444' },
  { emoji: '🤩', label: 'Excited', color: '#f97316' },
  { emoji: '😌', label: 'Peaceful', color: '#10b981' },
  { emoji: '💪', label: 'Strong', color: '#0ea5e9' },
  { emoji: '🥳', label: 'Celebratory', color: '#a855f7' },
  { emoji: '🤒', label: 'Unwell', color: '#64748b' },
];

const START_DATE = new Date('2026-01-20T00:00:00');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useCountup() {
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const totalSecs = Math.floor((now.getTime() - START_DATE.getTime()) / 1000);
      setElapsed({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function LoveApp({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const [tab, setTab] = useState<'home' | 'chat' | 'moods' | 'memories' | 'map' | 'wishes'>('home');
  const [online, setOnline] = useState<Record<User, boolean>>({ shailu: false, bhavi: false });
  const [moods, setMoods] = useState<Record<User, Mood | null>>({ shailu: null, bhavi: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [locations, setLocations] = useState<Record<User, LocationData | null>>({ shailu: null, bhavi: null });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [newNotif, setNewNotif] = useState<string | null>(null);
  const elapsed = useCountup();

  const other: User = currentUser === 'shailu' ? 'bhavi' : 'shailu';
  const otherName = currentUser === 'shailu' ? 'bhavi 👑' : 'Shailu 💙';

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    // Online presence
    const presenceRef = ref(db, `presence/${currentUser}`);
    set(presenceRef, { online: true, timestamp: Date.now() });
    const unloadFn = () => set(presenceRef, { online: false, timestamp: Date.now() });
    window.addEventListener('beforeunload', unloadFn);

    const unsub1 = onValue(ref(db, 'presence'), snap => {
      const data = snap.val() || {};
      setOnline({
        shailu: data.shailu?.online || false,
        bhavi: data.bhavi?.online || false,
      });
    });

    const unsub2 = onValue(ref(db, 'moods'), snap => {
      const data = snap.val() || {};
      setMoods({
        shailu: data.shailu || null,
        bhavi: data.bhavi || null,
      });
    });

    const unsub3 = onValue(ref(db, 'messages'), snap => {
      const data = snap.val() || {};
      const msgs = Object.entries(data).map(([id, v]) => ({ id, ...(v as Omit<Message, 'id'>) }));
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
    });

    const unsub4 = onValue(ref(db, 'locations'), snap => {
      const data = snap.val() || {};
      setLocations({ shailu: data.shailu || null, bhavi: data.bhavi || null });
    });

    const unsub5 = onValue(ref(db, 'memories'), snap => {
      const data = snap.val() || {};
      const mems = Object.entries(data).map(([id, v]) => ({ id, ...(v as Omit<Memory, 'id'>) }));
      mems.sort((a, b) => b.timestamp - a.timestamp);
      setMemories(mems);
    });

    const unsub6 = onValue(ref(db, 'wishlist'), snap => {
      const data = snap.val() || {};
      const wishes = Object.entries(data).map(([id, v]) => ({ id, ...(v as Omit<Wishlist, 'id'>) }));
      wishes.sort((a, b) => b.timestamp - a.timestamp);
      setWishlist(wishes);
    });

    return () => {
      window.removeEventListener('beforeunload', unloadFn);
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
    };
  }, [currentUser]);

  // ── Share location ──────────────────────────────────────────────────────────
  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || 'Somewhere beautiful';
        set(ref(db, `locations/${currentUser}`), { lat, lng, city, timestamp: Date.now(), user: currentUser });
        setNewNotif('📍 Location shared!');
        setTimeout(() => setNewNotif(null), 3000);
      } catch {
        set(ref(db, `locations/${currentUser}`), { lat, lng, city: 'Our spot 📍', timestamp: Date.now(), user: currentUser });
      }
    });
  }, [currentUser]);

  const tabs = [
    { id: 'home', label: '🏠', title: 'Home' },
    { id: 'chat', label: '💬', title: 'Chat' },
    { id: 'moods', label: '🌸', title: 'Moods' },
    { id: 'memories', label: '📸', title: 'Memories' },
    { id: 'map', label: '🗺️', title: 'Map' },
    { id: 'wishes', label: '⭐', title: 'Wishes' },
  ] as const;

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #fdf6f0 0%, #fde8ee 100%)' }}>
      {/* Floating petal BG */}
      <PetalBackground />

      {/* Notification toast */}
      {newNotif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pop-in glass px-6 py-3 rounded-2xl font-body text-sm font-semibold shadow-lg"
          style={{ color: '#7c2d44', border: '1px solid rgba(244,63,94,0.3)' }}>
          {newNotif}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="heartbeat text-2xl">💕</span>
            <div>
              <h1 className="font-display text-base font-bold leading-tight" style={{ color: '#7c2d44' }}>
                Shailu & bhavi
              </h1>
              <p className="text-xs" style={{ color: '#c084a0' }}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${online[other] ? 'bg-green-400' : 'bg-gray-300'}`} />
                {online[other] ? `${otherName} is here 🌸` : `${otherName} is away`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#fce7f3', color: '#be185d' }}>
              {currentUser === 'shailu' ? '👦 Shailu' : '👩 bhavi'}
            </span>
            <button onClick={onLogout} className="text-xs px-2 py-1 rounded-lg hover:bg-pink-100 transition-colors" style={{ color: '#c084a0' }}>
              ✕
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="sticky top-[57px] z-30 glass border-b border-pink-100">
        <div className="max-w-2xl mx-auto flex overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex-1 min-w-0 py-2.5 flex flex-col items-center gap-0.5 text-xs font-body transition-all ${
                tab === t.id ? 'tab-active' : 'opacity-50 hover:opacity-80'
              }`}
              style={{ color: tab === t.id ? '#f43f5e' : '#c084a0' }}>
              <span className="text-lg">{t.label}</span>
              <span className="hidden sm:block">{t.title}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {tab === 'home' && <HomeTab elapsed={elapsed} moods={moods} currentUser={currentUser} otherName={otherName} online={online} shareLocation={shareLocation} />}
        {tab === 'chat' && <ChatTab messages={messages} currentUser={currentUser} otherName={otherName} setNewNotif={setNewNotif} />}
        {tab === 'moods' && <MoodsTab currentUser={currentUser} moods={moods} otherName={otherName} setNewNotif={setNewNotif} />}
        {tab === 'memories' && <MemoriesTab memories={memories} currentUser={currentUser} setNewNotif={setNewNotif} />}
        {tab === 'map' && <MapTab locations={locations} currentUser={currentUser} shareLocation={shareLocation} />}
        {tab === 'wishes' && <WishlistTab wishlist={wishlist} currentUser={currentUser} otherName={otherName} setNewNotif={setNewNotif} />}
      </main>
    </div>
  );
}

// ─── Petal Background ─────────────────────────────────────────────────────────
function PetalBackground() {
  const petals = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 5 + i * 12,
    delay: i * 1.2,
    duration: 8 + i * 1.5,
    emoji: ['🌸', '🌺', '💮', '🌹', '🌷'][i % 5],
  }));
  return (
    <>
      {petals.map(p => (
        <div key={p.id} className="petal" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          fontSize: '1rem',
          opacity: 0.4,
        }}>{p.emoji}</div>
      ))}
    </>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ elapsed, moods, currentUser, otherName, online, shareLocation }: {
  elapsed: { days: number; hours: number; minutes: number; seconds: number };
  moods: Record<User, Mood | null>;
  currentUser: User;
  otherName: string;
  online: Record<User, boolean>;
  shareLocation: () => void;
}) {
  const other: User = currentUser === 'shailu' ? 'bhavi' : 'shailu';
  const quotes = [
    "Distance means so little when someone means so much 💕",
    "In a sea of people, my eyes will always search for you 🌊",
    "Every heartbeat counts the moments till I see you again 💓",
    "You are my today and all of my tomorrows 🌅",
    "Missing you is proof that we had something beautiful 🌸",
  ];
  const quote = quotes[elapsed.days % quotes.length];

  return (
    <div className="space-y-5">
      {/* Love counter */}
      <div className="rounded-3xl p-6 text-center relative overflow-hidden glow"
        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white' }}>
        <div className="shimmer absolute inset-0" />
        <p className="font-display text-sm italic mb-1 opacity-90">Together since Jan 20, 2026</p>
        <h2 className="font-display text-2xl font-bold mb-4">Our Love Story 💕</h2>
        <div className="grid grid-cols-4 gap-2 relative z-10">
          {[
            { v: elapsed.days, l: 'Days' },
            { v: elapsed.hours, l: 'Hours' },
            { v: elapsed.minutes, l: 'Mins' },
            { v: elapsed.seconds, l: 'Secs' },
          ].map(({ v, l }) => (
            <div key={l} className="rounded-2xl py-2 px-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="font-display font-bold text-2xl flip-in">{String(v).padStart(2, '0')}</div>
              <div className="text-xs opacity-80">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div className="glass rounded-3xl p-5 text-center">
        <p className="font-display italic text-base" style={{ color: '#7c2d44' }}>"{quote}"</p>
        <p className="text-xs mt-2" style={{ color: '#c084a0' }}>— a reminder for today 🌸</p>
      </div>

      {/* Mood preview */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-display text-base font-semibold mb-3" style={{ color: '#7c2d44' }}>
          How we're feeling 🌡️
        </h3>
        <div className="flex gap-3 justify-around">
          {(['shailu', 'bhavi'] as User[]).map(u => (
            <div key={u} className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(253,232,238,0.7)' }}>
              <div className="text-3xl mb-1">{moods[u]?.emoji || '🌙'}</div>
              <div className="text-xs font-semibold" style={{ color: '#7c2d44' }}>
                {u === 'shailu' ? 'Shailu' : 'bhavi 👑'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#c084a0' }}>
                {moods[u]?.label || 'Not set yet'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickCard emoji="💌" label="Send a hug" color="#f43f5e" action={() => {
          push(ref(db, 'messages'), {
            from: currentUser, text: '🤗 Sending you the biggest hug right now!',
            type: 'hug', timestamp: Date.now()
          });
        }} />
        <QuickCard emoji="💋" label="Blow a kiss" color="#ec4899" action={() => {
          push(ref(db, 'messages'), {
            from: currentUser, text: '💋 Mwah! Sending a kiss across the distance ✨',
            type: 'kiss', timestamp: Date.now()
          });
        }} />
        <QuickCard emoji="📍" label="Share location" color="#8b5cf6" action={shareLocation} />
        <QuickCard emoji="✨" label={online[other] ? 'They\'re here!' : 'Send a poke'} color="#f59e0b" action={() => {
          push(ref(db, 'messages'), {
            from: currentUser, text: '👉 Hey! Just poking you to say I love you~',
            type: 'text', timestamp: Date.now()
          });
        }} />
      </div>

      {/* Anniversary countdown */}
      <AnniversaryCard />
    </div>
  );
}

function QuickCard({ emoji, label, color, action }: { emoji: string; label: string; color: string; action: () => void }) {
  const [pulse, setPulse] = useState(false);
  return (
    <button onClick={() => { action(); setPulse(true); setTimeout(() => setPulse(false), 600); }}
      className={`rounded-2xl p-4 text-center transition-all duration-200 hover:scale-105 active:scale-95 ${pulse ? 'scale-110' : ''}`}
      style={{ background: `${color}18`, border: `1.5px solid ${color}33` }}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs font-semibold" style={{ color }}>{label}</div>
    </button>
  );
}

function AnniversaryCard() {
  const next = new Date('2027-01-20T00:00:00');
  const now = new Date();
  const days = Math.ceil((next.getTime() - now.getTime()) / 86400000);
  return (
    <div className="rounded-3xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #fce7f3, #fde8ee)', border: '1.5px solid #f9a8c9' }}>
      <p className="text-2xl mb-1">🎊</p>
      <p className="font-display font-semibold text-sm" style={{ color: '#7c2d44' }}>1st Anniversary Countdown</p>
      <p className="font-display text-3xl font-bold mt-1" style={{ color: '#f43f5e' }}>{days} days to go</p>
      <p className="text-xs mt-1" style={{ color: '#c084a0' }}>Jan 20, 2027 — a day to cherish 💕</p>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab({ messages, currentUser, otherName, setNewNotif }: {
  messages: Message[];
  currentUser: User;
  otherName: string;
  setNewNotif: (s: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [type, setType] = useState<'text' | 'letter'>('text');
  const [letterOpen, setLetterOpen] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    push(ref(db, 'messages'), {
      from: currentUser, text: text.trim(), type, timestamp: Date.now()
    });
    setText('');
    setNewNotif('💌 Message sent!');
    setTimeout(() => setNewNotif(null), 2000);
  };

  const react = (id: string, emoji: string) => {
    update(ref(db, `messages/${id}`), { reaction: emoji });
  };

  const REACTIONS = ['❤️', '😍', '🥰', '😂', '🥺', '💋'];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Message type selector */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setType('text')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${type === 'text' ? 'text-white' : ''}`}
          style={{ background: type === 'text' ? '#f43f5e' : '#fde8ee', color: type === 'text' ? 'white' : '#c084a0' }}>
          💬 Message
        </button>
        <button onClick={() => setType('letter')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all`}
          style={{ background: type === 'letter' ? '#f43f5e' : '#fde8ee', color: type === 'letter' ? 'white' : '#c084a0' }}>
          💌 Love Letter
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💌</p>
            <p className="font-display text-base" style={{ color: '#c084a0' }}>Your love notes will appear here...</p>
          </div>
        )}
        {messages.map(msg => {
          const mine = msg.from === currentUser;
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'letter' ? (
                <div className="max-w-xs">
                  {!letterOpen || letterOpen !== msg.id ? (
                    <button onClick={() => setLetterOpen(msg.id)}
                      className="rounded-2xl p-4 flex items-center gap-2 hover:scale-105 transition-transform"
                      style={{ background: mine ? '#fce7f3' : '#fdf6f0', border: '2px dashed #f9a8c9' }}>
                      <span className="text-2xl">💌</span>
                      <div className="text-left">
                        <div className="text-xs font-semibold" style={{ color: '#7c2d44' }}>A love letter for you</div>
                        <div className="text-xs" style={{ color: '#c084a0' }}>Tap to open 🌸</div>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-2xl p-5 letter-unfold" style={{ background: '#fdf6f0', border: '2px solid #f9a8c9', maxWidth: '300px' }}>
                      <div className="text-center text-xl mb-2">💌</div>
                      <p className="font-display italic text-sm leading-relaxed" style={{ color: '#7c2d44' }}>{msg.text}</p>
                      <button onClick={() => setLetterOpen(null)} className="mt-3 text-xs" style={{ color: '#c084a0' }}>Close ✕</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="group max-w-xs">
                  <div className={`rounded-2xl px-4 py-2.5 relative ${mine ? 'rounded-br-md' : 'rounded-bl-md'}`}
                    style={{ background: mine ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(253,232,238,0.9)', color: mine ? 'white' : '#7c2d44' }}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 ${mine ? 'opacity-70' : ''}`} style={{ color: mine ? 'white' : '#c084a0' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {msg.reaction && (
                      <span className="absolute -bottom-3 right-2 text-sm bg-white rounded-full px-1.5 shadow-sm">{msg.reaction}</span>
                    )}
                  </div>
                  {!mine && (
                    <div className="hidden group-hover:flex gap-1 mt-1 ml-2">
                      {REACTIONS.map(r => (
                        <button key={r} onClick={() => react(msg.id, r)} className="text-xs hover:scale-125 transition-transform">{r}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 glass rounded-2xl p-3 flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={type === 'letter' ? 'Write your love letter here... 💌' : 'Say something sweet~ 🌸'}
          className="flex-1 bg-transparent text-sm resize-none outline-none"
          style={{ color: '#7c2d44', minHeight: '40px', maxHeight: '100px' }}
          rows={1}
        />
        <button onClick={send}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg transition-all hover:scale-110 active:scale-95 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}>
          {type === 'letter' ? '💌' : '💕'}
        </button>
      </div>
    </div>
  );
}

// ─── Moods Tab ────────────────────────────────────────────────────────────────
function MoodsTab({ currentUser, moods, otherName, setNewNotif }: {
  currentUser: User;
  moods: Record<User, Mood | null>;
  otherName: string;
  setNewNotif: (s: string | null) => void;
}) {
  const other: User = currentUser === 'shailu' ? 'bhavi' : 'shailu';
  const [emotion, setEmotion] = useState('');

  const setMood = (mood: Mood) => {
    set(ref(db, `moods/${currentUser}`), { ...mood, timestamp: Date.now() });
    setNewNotif(`${mood.emoji} Mood updated!`);
    setTimeout(() => setNewNotif(null), 2000);
  };

  const sendEmotion = () => {
    if (!emotion.trim()) return;
    push(ref(db, 'messages'), {
      from: currentUser, text: `💭 Feeling: "${emotion.trim()}"`, type: 'text', timestamp: Date.now()
    });
    setEmotion('');
    setNewNotif('💭 Emotion shared!');
    setTimeout(() => setNewNotif(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Other's mood */}
      {moods[other] && (
        <div className="glass rounded-3xl p-5 text-center">
          <p className="text-xs mb-2" style={{ color: '#c084a0' }}>{otherName} is feeling...</p>
          <div className="text-5xl mb-2">{moods[other]!.emoji}</div>
          <p className="font-display font-semibold text-lg" style={{ color: '#7c2d44' }}>{moods[other]!.label}</p>
        </div>
      )}

      {/* My mood */}
      <div>
        <h3 className="font-display text-base font-semibold mb-3" style={{ color: '#7c2d44' }}>
          How are you feeling? 🌸
        </h3>
        <div className="grid grid-cols-4 gap-2.5">
          {MOODS.map(mood => (
            <button key={mood.label} onClick={() => setMood(mood)}
              className={`mood-card rounded-2xl p-2.5 text-center flex flex-col items-center gap-1 ${
                moods[currentUser]?.label === mood.label ? 'selected' : ''
              }`}
              style={{ background: `${mood.color}15`, border: `1.5px solid ${mood.color}33` }}>
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: mood.color }}>{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emotion journal */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-display text-base font-semibold mb-3" style={{ color: '#7c2d44' }}>
          Share what's in your heart 💭
        </h3>
        <textarea
          value={emotion}
          onChange={e => setEmotion(e.target.value)}
          placeholder="I'm feeling... because... and I wish..."
          className="w-full bg-white bg-opacity-60 rounded-xl p-3 text-sm outline-none resize-none"
          style={{ color: '#7c2d44', minHeight: '80px', border: '1px solid #f9a8c9' }}
          rows={3}
        />
        <button onClick={sendEmotion}
          className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-98"
          style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
          💌 Share this feeling
        </button>
      </div>

      {/* Emotion buttons */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-display text-base font-semibold mb-3" style={{ color: '#7c2d44' }}>Quick feels 💓</h3>
        <div className="flex flex-wrap gap-2">
          {['I miss you so much 🥺', 'I\'m thinking of you 💭', 'You made me smile today 😊', 
            'Sending you warmth 🤗', 'I love you a lot 💕', 'I need a hug 🫂',
            'Can\'t wait to talk 💬', 'You\'re my sunshine 🌞'].map(feel => (
            <button key={feel}
              onClick={() => {
                push(ref(db, 'messages'), { from: currentUser, text: feel, type: 'text', timestamp: Date.now() });
                setNewNotif('💕 Feeling sent!');
                setTimeout(() => setNewNotif(null), 2000);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
              style={{ background: '#fce7f3', color: '#be185d' }}>
              {feel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Memories Tab ─────────────────────────────────────────────────────────────
function MemoriesTab({ memories, currentUser, setNewNotif }: {
  memories: Memory[];
  currentUser: User;
  setNewNotif: (s: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', note: '', emoji: '🌸', date: '' });
  const EMOJIS = ['🌸', '💕', '🥰', '🌹', '✨', '🎊', '💌', '🌙', '⭐', '🌈', '🎂', '🫂'];

  const save = () => {
    if (!form.title.trim()) return;
    push(ref(db, 'memories'), {
      ...form, from: currentUser, timestamp: Date.now()
    });
    setForm({ title: '', note: '', emoji: '🌸', date: '' });
    setAdding(false);
    setNewNotif('📸 Memory saved!');
    setTimeout(() => setNewNotif(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button onClick={() => setAdding(true)}
        className="w-full py-3.5 rounded-2xl text-white font-display font-semibold text-base transition-all hover:scale-105 active:scale-98"
        style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)', boxShadow: '0 6px 20px rgba(244,63,94,0.3)' }}>
        ✨ Add a Memory
      </button>

      {/* Add form */}
      {adding && (
        <div className="glass rounded-3xl p-5 letter-unfold space-y-3">
          <h3 className="font-display font-semibold" style={{ color: '#7c2d44' }}>Capture a moment 🌸</h3>
          
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                className={`text-xl rounded-xl p-1.5 transition-all ${form.emoji === e ? 'scale-125' : 'hover:scale-110'}`}
                style={{ background: form.emoji === e ? '#fce7f3' : 'transparent' }}>
                {e}
              </button>
            ))}
          </div>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What happened? ✨"
            className="w-full bg-white bg-opacity-60 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ color: '#7c2d44', border: '1px solid #f9a8c9' }}
          />
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-white bg-opacity-60 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ color: '#7c2d44', border: '1px solid #f9a8c9' }}
          />
          <textarea
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Tell the story... 💭"
            className="w-full bg-white bg-opacity-60 rounded-xl px-3 py-2 text-sm outline-none resize-none"
            style={{ color: '#7c2d44', border: '1px solid #f9a8c9', minHeight: '80px' }}
            rows={3}
          />
          <div className="flex gap-2">
            <button onClick={save}
              className="flex-1 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#f43f5e' }}>Save 💕</button>
            <button onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#fde8ee', color: '#c084a0' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Memory list */}
      {memories.length === 0 && !adding && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📸</p>
          <p className="font-display text-base" style={{ color: '#c084a0' }}>Your memories will live here...</p>
        </div>
      )}
      
      <div className="space-y-3">
        {memories.map(mem => (
          <div key={mem.id} className="glass rounded-2xl p-4 flex gap-3">
            <div className="text-3xl flex-shrink-0">{mem.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display font-semibold text-sm" style={{ color: '#7c2d44' }}>{mem.title}</p>
                <span className="text-xs flex-shrink-0" style={{ color: '#c084a0' }}>{mem.date}</span>
              </div>
              {mem.note && <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9f1239', opacity: 0.8 }}>{mem.note}</p>}
              <p className="text-xs mt-1.5" style={{ color: '#c084a0' }}>
                from {mem.from === 'shailu' ? 'Shailu 💙' : 'bhavi 👑'} · {formatDistanceToNow(mem.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Map Tab ──────────────────────────────────────────────────────────────────
function MapTab({ locations, currentUser, shareLocation }: {
  locations: Record<User, LocationData | null>;
  currentUser: User;
  shareLocation: () => void;
}) {
  const other: User = currentUser === 'shailu' ? 'bhavi' : 'shailu';
  const dist = locations.shailu && locations.bhavi
    ? Math.round(getDistance(locations.shailu.lat, locations.shailu.lng, locations.bhavi.lat, locations.bhavi.lng))
    : null;

  return (
    <div className="space-y-5">
      {/* Distance display */}
      <div className="glass rounded-3xl p-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl">👦</div>
            <div className="text-xs mt-1" style={{ color: '#7c2d44' }}>Shailu</div>
            {locations.shailu && (
              <div className="text-xs" style={{ color: '#c084a0' }}>{locations.shailu.city}</div>
            )}
          </div>

          {/* Animated distance line */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <svg width="100%" height="40" viewBox="0 0 120 40">
              <path d="M10 20 Q60 5 110 20" stroke="#f9a8c9" strokeWidth="2" fill="none"
                strokeDasharray="4 3" className="distance-line" />
              <text x="60" y="36" textAnchor="middle" fontSize="8" fill="#c084a0">
                {dist ? `${dist.toLocaleString()} km` : '···'}
              </text>
            </svg>
            {dist && (
              <p className="font-display font-bold text-lg" style={{ color: '#f43f5e' }}>
                {dist.toLocaleString()} km apart
              </p>
            )}
            {!dist && <p className="text-xs" style={{ color: '#c084a0' }}>Share locations to see distance</p>}
          </div>

          <div className="text-center">
            <div className="text-3xl">👩</div>
            <div className="text-xs mt-1" style={{ color: '#7c2d44' }}>bhavi 👑</div>
            {locations.bhavi && (
              <div className="text-xs" style={{ color: '#c084a0' }}>{locations.bhavi.city}</div>
            )}
          </div>
        </div>

        {dist && (
          <p className="text-sm font-display italic" style={{ color: '#c084a0' }}>
            {dist < 100 ? '🥰 So close!' : dist < 500 ? '🌸 Not too far...' : dist < 1000 ? '💕 Missing across the miles' : '🌍 Distance can\'t dim this love'}
          </p>
        )}
      </div>

      {/* Share button */}
      <button onClick={shareLocation}
        className="w-full py-3.5 rounded-2xl text-white font-display font-semibold transition-all hover:scale-105 active:scale-98"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 6px 20px rgba(139,92,246,0.3)' }}>
        📍 Share My Location
      </button>

      {/* Location cards */}
      <div className="space-y-3">
        {(['shailu', 'bhavi'] as User[]).map(u => (
          locations[u] && (
            <div key={u} className="glass rounded-2xl p-4 flex gap-3 items-center">
              <span className="text-2xl">{u === 'shailu' ? '👦' : '👩'}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#7c2d44' }}>
                  {u === 'shailu' ? 'Shailu' : 'bhavi 👑'} is in {locations[u]!.city}
                </p>
                <p className="text-xs" style={{ color: '#c084a0' }}>
                  📍 {locations[u]!.lat.toFixed(4)}, {locations[u]!.lng.toFixed(4)} · {formatDistanceToNow(locations[u]!.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Fun distance facts */}
      {dist && (
        <div className="glass rounded-3xl p-5">
          <h3 className="font-display font-semibold text-sm mb-3" style={{ color: '#7c2d44' }}>
            Fun distance facts ✨
          </h3>
          <div className="space-y-2">
            <p className="text-xs" style={{ color: '#9f1239' }}>🚗 {Math.round(dist / 100)} hours drive at 100km/h</p>
            <p className="text-xs" style={{ color: '#9f1239' }}>✈️ {Math.round(dist / 800)} hours by plane</p>
            <p className="text-xs" style={{ color: '#9f1239' }}>💌 A love letter that travels {dist.toLocaleString()}km</p>
            <p className="text-xs" style={{ color: '#9f1239' }}>💕 And yet the heart feels zero distance</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wishlist Tab ─────────────────────────────────────────────────────────────
function WishlistTab({ wishlist, currentUser, otherName, setNewNotif }: {
  wishlist: Wishlist[];
  currentUser: User;
  otherName: string;
  setNewNotif: (s: string | null) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    push(ref(db, 'wishlist'), {
      item: input.trim(), from: currentUser, done: false, timestamp: Date.now()
    });
    setInput('');
    setNewNotif('⭐ Wish added!');
    setTimeout(() => setNewNotif(null), 2000);
  };

  const toggle = (id: string, done: boolean) => {
    update(ref(db, `wishlist/${id}`), { done: !done });
  };

  const categories = [
    { label: 'Things to do together 🎯', emoji: '🗺️', placeholder: 'Watch the sunset together...' },
    { label: 'Places to visit 🌍', emoji: '✈️', placeholder: 'Go to Goa...' },
    { label: 'Things to make each other feel loved 💕', emoji: '💕', placeholder: 'Surprise with a playlist...' },
  ];

  const pending = wishlist.filter(w => !w.done);
  const done = wishlist.filter(w => w.done);

  return (
    <div className="space-y-5">
      {/* Quick categories */}
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.label} className="glass rounded-2xl p-3 flex items-center gap-2">
            <span className="text-xl">{c.emoji}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: '#7c2d44' }}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add wish */}
      <div className="glass rounded-2xl p-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add a wish or dream... ⭐"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: '#7c2d44' }}
        />
        <button onClick={add}
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
          style={{ background: '#f43f5e' }}>⭐</button>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold" style={{ color: '#7c2d44' }}>Our wishes ✨</h3>
          {pending.map(w => (
            <div key={w.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <button onClick={() => toggle(w.id, w.done)}
                className="w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all hover:scale-110"
                style={{ borderColor: '#f43f5e' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: '#7c2d44' }}>{w.item}</p>
                <p className="text-xs" style={{ color: '#c084a0' }}>
                  from {w.from === 'shailu' ? 'Shailu 💙' : 'bhavi 👑'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold" style={{ color: '#c084a0' }}>Done together 🎊</h3>
          {done.map(w => (
            <div key={w.id} className="rounded-2xl p-3 flex items-center gap-3 opacity-60"
              style={{ background: '#fce7f3' }}>
              <button onClick={() => toggle(w.id, w.done)}
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs"
                style={{ background: '#f43f5e' }}>✓</button>
              <p className="text-sm line-through" style={{ color: '#c084a0' }}>{w.item}</p>
            </div>
          ))}
        </div>
      )}

      {wishlist.length === 0 && (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-display text-sm" style={{ color: '#c084a0' }}>Dreams and wishes will sparkle here...</p>
        </div>
      )}
    </div>
  );
}
