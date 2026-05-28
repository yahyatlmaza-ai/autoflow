import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AppUser {
  id: string; email: string; name?: string;
  role?: string; plan?: string; trialEnd?: string;
  tenant_id?: string; isDemo?: boolean; fingerprint?: string;
}
export interface PlatformSettings {
  platform_name?: string; platform_tagline?: string; support_whatsapp?: string;
  currency?: string; platform_primary_color?: string; platform_logo_url?: string;
}
interface AppContextType {
  user: AppUser | null; setUser: (u: AppUser | null) => void;
  token: string | null; setToken: (t: string | null) => void;
  theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void;
  lang: 'en' | 'fr' | 'ar'; setLang: (l: 'en' | 'fr' | 'ar') => void;
  currency: string; setCurrency: (c: string) => void;
  sidebarCollapsed: boolean; setSidebarCollapsed: (v: boolean) => void;
  platformSettings: PlatformSettings; refreshSettings: () => Promise<void>;
  unreadCount: number; setUnreadCount: (n: number) => void;
  loading: boolean;
}

const Ctx = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(Ctx);

function applyTheme(t: 'dark' | 'light') {
  const r = document.documentElement;
  if (t === 'dark') {
    r.style.setProperty('--bg',     '#05050f');
    r.style.setProperty('--bg2',    'rgba(255,255,255,.03)');
    r.style.setProperty('--text',   '#ddd9f5');
    r.style.setProperty('--muted',  'rgba(221,217,245,.42)');
    r.style.setProperty('--border', 'rgba(255,255,255,.08)');
    r.style.setProperty('--card',   'rgba(255,255,255,.03)');
    r.style.setProperty('--input',  'rgba(255,255,255,.05)');
    r.style.setProperty('--nav',    'rgba(5,5,15,.92)');
    r.classList.add('dark'); r.classList.remove('light');
    document.body.style.background = '#05050f';
    document.body.style.color = '#ddd9f5';
  } else {
    r.style.setProperty('--bg',     '#f5f3ff');
    r.style.setProperty('--bg2',    'rgba(109,40,217,.04)');
    r.style.setProperty('--text',   '#1a0b3b');
    r.style.setProperty('--muted',  'rgba(26,11,59,.5)');
    r.style.setProperty('--border', 'rgba(109,40,217,.15)');
    r.style.setProperty('--card',   'rgba(255,255,255,.8)');
    r.style.setProperty('--input',  'rgba(255,255,255,.9)');
    r.style.setProperty('--nav',    'rgba(245,243,255,.95)');
    r.classList.add('light'); r.classList.remove('dark');
    document.body.style.background = '#f5f3ff';
    document.body.style.color = '#1a0b3b';
  }
}

function applyLang(l: string) {
  document.documentElement.lang = l;
  document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading]   = useState(true);
  const [user, setUserState]   = useState<AppUser | null>(() => {
    try { const s = localStorage.getItem('af_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [token, setTokenState] = useState<string | null>(() => {
    try { return localStorage.getItem('af_session_token'); } catch { return null; }
  });
  const [theme, setThemeState] = useState<'dark'|'light'>(() =>
    (localStorage.getItem('af_theme') as 'dark'|'light') ?? 'dark'
  );
  const [lang, setLangState]   = useState<'en'|'fr'|'ar'>(() =>
    (localStorage.getItem('af_lang') as 'en'|'fr'|'ar') ?? 'en'
  );
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('af_currency') ?? 'DZD');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ platform_name:'autoflow', support_whatsapp:'213794157508', currency:'DZD' });
  const [unreadCount, setUnreadCount] = useState(0);

  // Set loading false after initial sync state load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLoading(false); }, []);

  const setUser  = useCallback((u: AppUser | null) => { setUserState(u); try { u ? localStorage.setItem('af_user',JSON.stringify(u)) : localStorage.removeItem('af_user'); } catch {} }, []);
  const setToken = useCallback((t: string | null) => { setTokenState(t); try { t ? localStorage.setItem('af_session_token',t) : localStorage.removeItem('af_session_token'); } catch {} }, []);

  const setTheme = useCallback((t: 'dark'|'light') => {
    setThemeState(t);
    try { localStorage.setItem('af_theme', t); } catch {}
    applyTheme(t);
  }, []);

  const setLang = useCallback((l: 'en'|'fr'|'ar') => {
    setLangState(l);
    try { localStorage.setItem('af_lang', l); } catch {}
    applyLang(l);
  }, []);

  const setCurrency = useCallback((c: string) => { setCurrencyState(c); try { localStorage.setItem('af_currency',c); } catch {} }, []);

  const refreshSettings = useCallback(async () => {
    try { const r = await fetch('/api/settings'); if (r.ok) { const d = await r.json(); if (d && !d.error) setPlatformSettings(d); } } catch {}
  }, []);

  // Apply on mount
  useEffect(() => { applyTheme(theme); applyLang(lang); refreshSettings(); }, []);

  // Poll unread notifications
  useEffect(() => {
    if (!user || user.isDemo) return;
    const fetch_ = async () => {
      try { const r = await fetch('/api/notifications/unread', { headers:{ Authorization:`Bearer ${token}` }}); if (r.ok) { const d = await r.json(); setUnreadCount(d.count ?? 0); } } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 30000);
    return () => clearInterval(iv);
  }, [user, token]);

  return (
    <Ctx.Provider value={{ user,setUser,token,setToken,theme,setTheme,lang,setLang,currency,setCurrency,sidebarCollapsed,setSidebarCollapsed,platformSettings,refreshSettings,unreadCount,setUnreadCount,loading }}>
      {children}
    </Ctx.Provider>
  );
}
