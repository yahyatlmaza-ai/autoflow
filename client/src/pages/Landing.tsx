import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/* ─────────────────────────────────────────────────────────────
   TRANSLATIONS
───────────────────────────────────────────────────────────── */
const LANG = {
  en: {
    badge:'Algeria\'s #1 Logistics Platform',
    h1a:'Ship Smarter.', h1b:'Scale Faster.',
    sub:'The all-in-one order management & shipping automation platform for Algerian e-commerce. Connect every store, automate every shipment.',
    cta:'Start Free Trial', demo:'Watch Demo',
    trusted:'Trusted by',
    feat_title:'Everything You Need to Scale',
    feat_sub:'Powerful tools for Algerian e-commerce — without the enterprise price tag.',
    how_title:'Up & Running in 4 Steps',
    int_title:'Every Carrier. Every Platform.',
    vip_badge:'VIP EXCLUSIVE', vip_title:'VIP Premium Experience',
    vip_sub:'Exclusive perks for our premium subscribers to make you unstoppable.',
    vip_cta:'Get VIP Access Now',
    price_title:'Simple, Transparent Pricing',
    price_sub:'10-day free trial · No credit card · Cancel anytime',
    faq_title:'Frequently Asked Questions',
    cta2:'Ready to Transform Your Logistics?',
    cta2_sub:'Join 5,000+ merchants already growing with autoflow.',
    wa:'Chat on WhatsApp',
  },
  fr: {
    badge:'Plateforme logistique #1 en Algérie',
    h1a:'Livrez plus vite.', h1b:'Grandissez plus fort.',
    sub:'La plateforme tout-en-un pour automatiser vos expéditions en Algérie.',
    cta:'Essai gratuit', demo:'Voir la démo',
    trusted:'Partenaires de confiance',
    feat_title:'Tout ce dont vous avez besoin',
    feat_sub:'Des outils puissants pour le e-commerce algérien.',
    how_title:'Opérationnel en 4 étapes',
    int_title:'Chaque transporteur. Chaque plateforme.',
    vip_badge:'VIP EXCLUSIF', vip_title:'Expérience VIP Premium',
    vip_sub:'Des avantages exclusifs pour nos abonnés premium.',
    vip_cta:'Obtenir l\'accès VIP',
    price_title:'Tarification simple',
    price_sub:'10 jours d\'essai · Sans carte · Résiliable',
    faq_title:'Questions fréquentes',
    cta2:'Prêt à transformer votre logistique?',
    cta2_sub:'Rejoignez 5 000+ marchands qui grandissent avec autoflow.',
    wa:'Discuter sur WhatsApp',
  },
  ar: {
    badge:'منصة اللوجستيك رقم 1 في الجزائر',
    h1a:'شحن أسرع.', h1b:'نمو أكبر.',
    sub:'المنصة الشاملة لإدارة الطلبات وأتمتة الشحن للتجارة الإلكترونية الجزائرية.',
    cta:'ابدأ التجربة المجانية', demo:'شاهد العرض',
    trusted:'شركاء موثوقون',
    feat_title:'كل ما تحتاجه للنمو',
    feat_sub:'أدوات قوية للتجارة الإلكترونية الجزائرية.',
    how_title:'جاهز في 4 خطوات',
    int_title:'كل ناقل. كل منصة.',
    vip_badge:'VIP حصري', vip_title:'تجربة VIP المميزة',
    vip_sub:'مزايا حصرية لمشتركينا المميزين.',
    vip_cta:'احصل على وصول VIP الآن',
    price_title:'أسعار شفافة وبسيطة',
    price_sub:'10 أيام مجانية · بدون بطاقة · إلغاء في أي وقت',
    faq_title:'الأسئلة الشائعة',
    cta2:'مستعد لتحويل لوجستيكك؟',
    cta2_sub:'انضم إلى أكثر من 5000 تاجر ينمون مع autoflow.',
    wa:'تحدث على واتساب',
  },
} as const;

const FEATS = [
  { e:'🚚', t:'Multi-Carrier Shipping', d:'Yalidine, ZR Express, Noest, Amana, EMS, DHL, FedEx & UPS. Auto-assign per wilaya.' },
  { e:'⚡', t:'Order Automation', d:'Auto-import from Shopify, WooCommerce, Magento. Rule-based confirm & route logic.' },
  { e:'📍', t:'Live Tracking', d:'Real-time tracking across all carriers in one unified dashboard.' },
  { e:'💰', t:'COD Management', d:'Full cash-on-delivery lifecycle with reconciliation & weekly DZD reports.' },
  { e:'📊', t:'Analytics & Reports', d:'Revenue charts, carrier performance, wilaya breakdown. Export CSV/Excel.' },
  { e:'🏪', t:'Multi-Store Support', d:'Manage unlimited stores from one dashboard with strict tenant isolation.' },
  { e:'👥', t:'CRM & Customers', d:'Customer profiles with order history, spend tracking, repeat buyer detection.' },
  { e:'↩️', t:'Returns Handling', d:'Streamlined returns with automated labels and carrier reconciliation.' },
];

const STEPS = [
  { n:'01', t:'Connect Your Store', d:'Integrate Shopify, WooCommerce, or any platform via API in minutes.' },
  { n:'02', t:'Import Orders', d:'Orders sync in real-time. Bulk-process hundreds with one click.' },
  { n:'03', t:'Ship with Any Carrier', d:'Generate labels, pick the best carrier per wilaya, dispatch.' },
  { n:'04', t:'Track & Grow', d:'Live tracking, deep analytics, automated COD reconciliation.' },
];

const VIP_FEATS = [
  { e:'🎧', t:'Dedicated Account Manager', d:'Personal expert with 24/7 priority WhatsApp line.' },
  { e:'⚡', t:'Zero-Queue Priority Support', d:'Average reply < 2 min. Your tickets jump the queue.' },
  { e:'🚀', t:'Unlimited Stores & Carriers', d:'Connect as many stores and carriers as you need.' },
  { e:'🤖', t:'AI Shipping Optimizer', d:'Smart suggestions saving up to 30% on shipping costs.' },
  { e:'✨', t:'Custom Integrations', d:'We build the integrations you need — on-demand, free.' },
  { e:'🎁', t:'Early Access & Beta', d:'First to try new features and shape the roadmap.' },
  { e:'👑', t:'White-Label Branding', d:'Your logo, your colors, your domain.' },
  { e:'📈', t:'Exclusive Training', d:'Free monthly 1:1 sessions with logistics experts.' },
];

const FAQS = [
  { q:'How does the 10-day free trial work?', a:'Sign up, verify via OTP, get full Professional access for 10 days. No credit card required.' },
  { q:'Which Algerian carriers are supported?', a:'Yalidine, ZR Express, Noest, Amana, EMS Algeria + DHL, FedEx, UPS, Aramex internationally.' },
  { q:'Can I connect multiple stores?', a:'Yes. Shopify, WooCommerce, Magento, OpenCart or custom API. Basic: 5 stores, Pro: unlimited.' },
  { q:'Is Arabic RTL supported?', a:'Full Arabic RTL, French, and English. Each user switches language independently.' },
  { q:'How is COD managed?', a:'Full lifecycle: tracking, remittance reconciliation, discrepancy alerts, weekly DZD reports.' },
  { q:'How is my data secured?', a:'Row-level security on every table. JWT auth, device fingerprinting, rate limiting, input sanitization.' },
  { q:'Can I cancel anytime?', a:'Yes. No fees, no contracts. Full data export available at any time.' },
];

export default function Landing() {
  const navigate  = useNavigate();
  const { theme, setTheme, lang, setLang } = useApp();

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq,  setOpenFaq]  = useState<number | null>(null);
  const [mMenu,    setMMenu]    = useState(false);

  const T = LANG[lang as keyof typeof LANG] ?? LANG.en;
  const isDark = theme === 'dark';
  const isRTL  = lang === 'ar';

  // ── Scroll listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ── Intersection observer for reveal ────────────────────────────────────────
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'translateY(0)'; } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.af-rv').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ── THREE.JS hero ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    const init = async () => {
      let THREE: typeof import('three');
      try { THREE = await import('three'); } catch { return; }
      if (disposed) return;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Scene / Camera
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.z = 7;

      // ── Particle sphere ──────────────────────────────────────────────────
      const N = 2000;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const r  = 5.5 + Math.random() * 9;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
        pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
        pos[i*3+2] = r * Math.cos(ph);
        const t = Math.random();
        col[i*3]   = 0.38 + t * 0.26;
        col[i*3+1] = 0.22 + t * 0.14;
        col[i*3+2] = 0.94 + t * 0.06;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
      scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.045, vertexColors: true, transparent: true, opacity: 0.7,
      })));

      // ── Torus knot ───────────────────────────────────────────────────────
      const torus = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.75, 0.42, 200, 24),
        new THREE.MeshPhongMaterial({ color: 0x6d28d9, emissive: 0x2d1070, wireframe: true, transparent: true, opacity: 0.16 })
      );
      scene.add(torus);

      // ── Floating icosahedra ──────────────────────────────────────────────
      const mkIco = (r: number, x: number, y: number, z: number, c: number, op = 0.22) => {
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 1),
          new THREE.MeshPhongMaterial({ color: c, wireframe: true, transparent: true, opacity: op })
        );
        m.position.set(x, y, z); scene.add(m); return m;
      };
      const ic1 = mkIco(0.95,  3.5, -1.0, -1.2, 0x8b5cf6);
      const ic2 = mkIco(0.55, -3.5,  1.4, -1.5, 0x06b6d4);
      const ic3 = mkIco(0.42,  2.0,  2.6, -2.0, 0x10b981);
      const ic4 = mkIco(0.38, -2.0, -2.4, -1.0, 0xf59e0b, 0.28);
      const oct = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshPhongMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.28 })
      );
      oct.position.set(-2.8, -1.7, -0.8); scene.add(oct);

      // ── Lights ───────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x6d28d9, 0.5));
      const pl1 = new THREE.PointLight(0x8b5cf6, 3.0, 22); pl1.position.set(0, 0, 4); scene.add(pl1);
      const pl2 = new THREE.PointLight(0x06b6d4, 1.4, 18); pl2.position.set(5, 2, -2); scene.add(pl2);

      // ── Mouse parallax ───────────────────────────────────────────────────
      let mx = 0, my = 0;
      const onMouse = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth  - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      document.addEventListener('mousemove', onMouse, { passive: true });

      // ── Resize ───────────────────────────────────────────────────────────
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      // ── Animate ──────────────────────────────────────────────────────────
      let t = 0;
      const tick = () => {
        if (disposed) return;
        rafRef.current = requestAnimationFrame(tick);
        t += 0.005;
        torus.rotation.x = t * 0.27; torus.rotation.y = t * 0.43;
        ic1.rotation.x = t * 0.38;  ic1.rotation.y = -t * 0.53;
        ic2.rotation.x = -t * 0.47; ic2.rotation.z =  t * 0.32;
        ic3.rotation.y = t * 0.57;  ic3.rotation.x = -t * 0.27;
        ic4.rotation.x = t * 0.41;  ic4.rotation.z = -t * 0.34;
        oct.rotation.x = t * 0.32;  oct.rotation.z =  t * 0.23;
        // Gentle float
        torus.position.y = Math.sin(t * 0.52) * 0.22;
        ic1.position.y = -1.0 + Math.sin(t * 0.82 + 1) * 0.15;
        // Parallax
        scene.rotation.y += (mx * 0.09 - scene.rotation.y) * 0.032;
        scene.rotation.x += (-my * 0.06 - scene.rotation.x) * 0.032;
        renderer.render(scene, camera);
      };
      tick();

      // Cleanup
      return () => {
        document.removeEventListener('mousemove', onMouse);
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(rafRef.current);
        renderer.dispose();
        pGeo.dispose();
      };
    };

    let innerCleanup: (() => void) | undefined;
    init().then(fn => { innerCleanup = fn; });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      innerCleanup?.();
    };
  }, []); // run once

  // ── CSS vars (theme-aware) ─────────────────────────────────────────────────
  const C = {
    bg:     isDark ? '#05050f'               : '#f5f3ff',
    card:   isDark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.85)',
    border: isDark ? 'rgba(255,255,255,.08)' : 'rgba(109,40,217,.14)',
    text:   isDark ? '#ddd9f5'               : '#1a0b3b',
    muted:  isDark ? 'rgba(221,217,245,.42)' : 'rgba(26,11,59,.52)',
    nav:    scrolled
      ? isDark ? 'rgba(5,5,15,.92)'     : 'rgba(245,243,255,.95)'
      : 'transparent',
    navBorder: scrolled ? (isDark ? 'rgba(255,255,255,.06)' : 'rgba(109,40,217,.15)') : 'transparent',
  };

  const G = { primary: 'linear-gradient(135deg,#6d28d9,#8b5cf6)', vip: 'linear-gradient(90deg,#f59e0b,#f97316,#ec4899)', wa: 'linear-gradient(135deg,#128c3b,#25d366)' };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight:'100vh', background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflowX:'hidden', transition:'background .35s,color .35s' }}>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        .af-rv{opacity:0;transform:translateY(28px);transition:opacity .65s ease,transform .65s ease}
        .grad{background:linear-gradient(105deg,#818cf8 0%,#c084fc 45%,#38bdf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200%;animation:gsh 5s ease infinite}
        @keyframes gsh{0%,100%{background-position:0%}50%{background-position:100%}}
        .vip-grad{background:linear-gradient(90deg,#f97316,#ec4899,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .float-mock{animation:flt 7s ease-in-out infinite}
        @keyframes flt{0%,100%{transform:perspective(1100px) rotateY(-5deg) rotateX(3deg) translateY(0)}50%{transform:perspective(1100px) rotateY(-5deg) rotateX(3deg) translateY(-10px)}}
        .mq-track{display:flex;gap:10px;width:max-content;animation:mqa 28s linear infinite}
        .mq-track:hover{animation-play-state:paused}
        @keyframes mqa{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .hov-lift{transition:transform .22s,box-shadow .22s;cursor:default}
        .hov-lift:hover{transform:translateY(-4px)}
        .wa-pulse{animation:wap 2.5s ease-in-out infinite}
        @keyframes wap{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.5)}60%{box-shadow:0 0 0 14px rgba(37,211,102,0)}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(109,40,217,.4);border-radius:3px}
        select option{background:#1a0b3b;color:#fff}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @media(max-width:768px){
          .af-hide-mobile{display:none!important}
          .af-hero-grid{grid-template-columns:1fr!important;text-align:center}
          .af-hero-grid .hbtns{justify-content:center!important}
          .af-hero-grid .hstats{justify-content:center!important}
          .af-feat-grid{grid-template-columns:repeat(2,1fr)!important}
          .af-steps{grid-template-columns:repeat(2,1fr)!important}
          .af-steps::after{display:none!important}
          .af-plans{grid-template-columns:1fr!important}
          .af-tgrid{grid-template-columns:1fr!important}
          .af-vip-grid{grid-template-columns:repeat(2,1fr)!important}
          .af-footer-top{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:500px){
          .af-feat-grid{grid-template-columns:1fr!important}
          .af-steps{grid-template-columns:1fr!important}
          .af-vip-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ════════ NAV ════════ */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 40px', background:C.nav, backdropFilter: scrolled ? 'blur(24px)' : 'none', borderBottom:`1px solid ${C.navBorder}`, transition:'all .35s' }}>
        {/* Logo */}
        <a href="#" style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:G.primary, display:'grid', placeItems:'center', fontSize:16, color:'#fff', fontWeight:900, flexShrink:0 }}>✦</div>
          <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, color:C.text, letterSpacing:'-.02em' }}>auto<span style={{ color:'#a78bfa' }}>flow</span></span>
        </a>

        {/* Desktop links */}
        <div className="af-hide-mobile" style={{ display:'flex', alignItems:'center', gap:28 }}>
          {(['features','how','integrations','pricing'] as const).map(id => (
            <a key={id} href={`#${id}`} style={{ fontSize:13.5, color:C.muted, fontWeight:500, transition:'color .18s' }}
              onMouseOver={e => e.currentTarget.style.color = isDark ? '#fff' : '#1a0b3b'}
              onMouseOut={e  => e.currentTarget.style.color = C.muted}>
              {id === 'features' ? 'Features' : id === 'how' ? 'How It Works' : id === 'integrations' ? 'Integrations' : 'Pricing'}
            </a>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Lang */}
          <select value={lang} onChange={e => setLang(e.target.value as 'en'|'fr'|'ar')}
            style={{ background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(109,40,217,.08)', border:`1px solid ${C.border}`, color:C.text, fontSize:12, borderRadius:9, padding:'6px 10px', cursor:'pointer', outline:'none', transition:'all .2s' }}>
            <option value="en">🇬🇧 EN</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="ar">🇩🇿 AR</option>
          </select>

          {/* Theme */}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{ width:34, height:34, borderRadius:9, background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(109,40,217,.08)', border:`1px solid ${C.border}`, cursor:'pointer', fontSize:15, display:'grid', placeItems:'center', transition:'all .2s', color:C.text }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Login */}
          <a href="/login" className="af-hide-mobile" style={{ fontSize:13.5, color:C.muted, padding:'7px 14px', transition:'color .18s' }}
            onMouseOver={e => e.currentTarget.style.color = isDark ? '#fff' : '#1a0b3b'}
            onMouseOut={e  => e.currentTarget.style.color = C.muted}>Login</a>

          {/* Sign up */}
          <button onClick={() => navigate('/signup')} style={{ padding:'9px 20px', borderRadius:100, background:G.primary, color:'#fff', fontSize:13.5, fontWeight:600, border:'none', cursor:'pointer', boxShadow:'0 0 20px rgba(109,40,217,.3)', transition:'all .2s' }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 36px rgba(109,40,217,.5)'; }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 20px rgba(109,40,217,.3)'; }}>
            Sign Up
          </button>

          {/* WA */}
          <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer"
            className='wa-btn' style={{ width:44, height:44, borderRadius:'50%', background:'#25D366', display:'grid', placeItems:'center', boxShadow:'0 4px 16px rgba(37,211,102,.4)', fontSize:17, transition:'transform .2s', flexShrink:0 }}
            onMouseOver={e => e.currentTarget.style.transform='scale(1.12)'}
            onMouseOut={e  => e.currentTarget.style.transform=''}>💬</a>

          {/* Mobile menu */}
          <button className="af-hide-desktop" onClick={() => setMMenu(!mMenu)} style={{ background:'none', border:'none', color:C.text, fontSize:22, cursor:'pointer', display:'none' }}
            aria-label="Menu">☰</button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mMenu && (
        <div style={{ position:'fixed', inset:0, zIndex:190, background: isDark ? 'rgba(5,5,15,.97)' : 'rgba(245,243,255,.97)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:32, padding:40 }}>
          <button onClick={() => setMMenu(false)} style={{ position:'absolute', top:20, right:24, background:'none', border:'none', color:C.text, fontSize:24, cursor:'pointer' }}>✕</button>
          {[['#features','Features'],['#how','How It Works'],['#pricing','Pricing']].map(([h,l]) => (
            <a key={h} href={h} onClick={() => setMMenu(false)} style={{ fontSize:22, fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, color:C.text }}>{l}</a>
          ))}
          <button onClick={() => { navigate('/signup'); setMMenu(false); }} style={{ padding:'13px 36px', borderRadius:100, background:G.primary, color:'#fff', fontSize:16, fontWeight:700, border:'none', cursor:'pointer' }}>Sign Up</button>
        </div>
      )}

      {/* ════════ HERO ════════ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        {/* Three.js canvas */}
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />

        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background: isDark
          ? 'radial-gradient(ellipse at 20% 50%,rgba(109,40,217,.1) 0%,transparent 55%)'
          : 'radial-gradient(ellipse at 20% 50%,rgba(109,40,217,.06) 0%,transparent 55%)',
          pointerEvents:'none' }} />

        {/* Grid dots */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:'radial-gradient(circle,rgba(109,40,217,.12) 1px,transparent 1px)', backgroundSize:'44px 44px', opacity: isDark ? 0.5 : 0.3 }} />

        {/* Content */}
        <div className="af-rv af-hero-grid" style={{ position:'relative', zIndex:2, maxWidth:1180, margin:'0 auto', padding:'100px 40px 60px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center', width:'100%' }}>

          {/* Left */}
          <div>
            {/* Badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 18px', borderRadius:100, background:'rgba(109,40,217,.1)', border:'1px solid rgba(109,40,217,.28)', fontSize:11, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'rgba(167,139,250,.9)', marginBottom:28 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#a78bfa', animation:'wap 2s infinite', display:'block' }} />
              {T.badge}
            </div>

            <h1 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(38px,4.8vw,66px)', fontWeight:800, lineHeight:1.02, letterSpacing:'-.03em', color:C.text, marginBottom:20 }}>
              {T.h1a}<br /><span className="grad">{T.h1b}</span>
            </h1>

            <p style={{ fontSize:16, color:C.muted, lineHeight:1.78, marginBottom:32, maxWidth:500, fontWeight:300 }}>{T.sub}</p>

            <div className="hbtns" style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:44 }}>
              <button onClick={() => navigate('/signup')} style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 30px', borderRadius:100, background:G.primary, color:'#fff', fontSize:15, fontWeight:600, border:'none', cursor:'pointer', boxShadow:'0 0 32px rgba(109,40,217,.3)', transition:'all .22s' }}
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 48px rgba(109,40,217,.5)'; }}
                onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 32px rgba(109,40,217,.3)'; }}>
                ✦ {T.cta} →
              </button>
              <button onClick={() => navigate('/demo')} style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 30px', borderRadius:100, background: isDark ? 'rgba(255,255,255,.07)' : 'rgba(109,40,217,.06)', color:C.text, fontSize:15, fontWeight:600, border:`1px solid ${C.border}`, cursor:'pointer', transition:'all .22s' }}
                onMouseOver={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.12)' : 'rgba(109,40,217,.12)'}
                onMouseOut={e  => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.07)' : 'rgba(109,40,217,.06)'}>
                ▶ {T.demo}
              </button>
            </div>

            <div className="hstats" style={{ display:'flex', gap:32, paddingTop:28, borderTop:`1px solid ${C.border}`, flexWrap:'wrap' }}>
              {[['2M+','Orders'],['5K+','Merchants'],['12+','Carriers'],['99.9%','Uptime']].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:24, fontWeight:800, color:C.text }}>{v}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2, letterSpacing:'.03em' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', inset:-28, borderRadius:30, background:'radial-gradient(ellipse,rgba(109,40,217,.18) 0%,transparent 70%)', pointerEvents:'none' }} />
            <div className="float-mock" style={{ background: isDark ? 'rgba(8,8,24,.96)' : 'rgba(255,255,255,.95)', border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden', boxShadow: isDark ? '0 50px 120px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.04)' : '0 30px 80px rgba(109,40,217,.15),0 0 0 1px rgba(109,40,217,.1)' }}>
              {/* Browser bar */}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 15px', background: isDark ? 'rgba(255,255,255,.025)' : 'rgba(109,40,217,.04)', borderBottom:`1px solid ${C.border}` }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c }} />)}
                <div style={{ flex:1, margin:'0 12px', background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(109,40,217,.06)', border:`1px solid ${C.border}`, borderRadius:5, fontSize:10, color:C.muted, padding:'3px 10px', fontFamily:'monospace' }}>app.autoflow.dz/dashboard</div>
              </div>
              {/* Dashboard body */}
              <div style={{ padding:12 }}>
                {/* Stat tiles */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:9 }}>
                  {[['ORDERS','2,847','▲+12%',true],['REVENUE','4.2M DZD','▲+8%',true],['DELIVERED','2,541','▲+15%',true],['PENDING','156','▼-3%',false]].map(([lbl,val,ch,up]) => (
                    <div key={String(lbl)} style={{ padding:'9px 10px', background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(109,40,217,.05)', border:`1px solid ${C.border}`, borderRadius:9 }}>
                      <div style={{ fontSize:7.5, color:C.muted, marginBottom:3, fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase' }}>{lbl}</div>
                      <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:13.5, fontWeight:800, color:C.text }}>{val}</div>
                      <div style={{ fontSize:8, marginTop:2, fontWeight:600, color: up ? '#0fcc7a' : '#f53b3b' }}>{ch}</div>
                    </div>
                  ))}
                </div>
                {/* Mini bar chart */}
                <div style={{ background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(109,40,217,.04)', border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 11px', marginBottom:9 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                    <span style={{ fontSize:9, fontWeight:600, color: isDark ? 'rgba(255,255,255,.6)' : '#6d28d9' }}>Revenue — 14 days</span>
                    <span style={{ fontSize:8, color:C.muted }}>Real-time</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:42 }}>
                    {[38,55,42,70,48,84,66,78,56,88,70,82,68,100].map((h,i) => (
                      <div key={i} style={{ flex:1, borderRadius:'3px 3px 0 0', height:`${h}%`, background:'linear-gradient(to top,#6d28d9,#a78bfa)', opacity:.8 }} />
                    ))}
                  </div>
                </div>
                {/* Orders table */}
                <div style={{ background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(109,40,217,.03)', border:`1px solid ${C.border}`, borderRadius:9, overflow:'hidden' }}>
                  {[['#2847','Karim B.','Yalidine','Delivered','4,500','#0fcc7a'],['#2846','Sarah M.','ZR Express','Shipped','8,200','#38bdf8'],['#2845','Ahmed T.','Noest','Processing','2,800','#f5a623'],['#2844','Lina H.','Amana','Pending','5,650','#9ca3af']].map(([id,c,ca,s,tot,sc]) => (
                    <div key={String(id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', fontSize:9, borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ color:C.muted, fontFamily:'monospace' }}>{id}</span>
                      <span style={{ fontWeight:600, color:C.text }}>{c}</span>
                      <span style={{ color:C.muted }}>{ca}</span>
                      <span style={{ padding:'2px 7px', borderRadius:100, fontSize:7.5, fontWeight:700, background:`${sc}20`, color:String(sc) }}>{s}</span>
                      <span style={{ fontWeight:700, color:C.text }}>{tot} DZD</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ TRUST STRIP ════════ */}
      <div style={{ borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'18px 0', background: isDark ? 'rgba(255,255,255,.015)' : 'rgba(109,40,217,.03)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px', display:'flex', alignItems:'center', gap:36, flexWrap:'wrap', justifyContent:'center' }}>
          <span style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.muted, fontWeight:600, flexShrink:0 }}>{T.trusted}</span>
          {['📦 Yalidine','🚚 ZR Express','⚡ Noest','🏷️ Amana','🛍️ Shopify','🛒 WooCommerce','🟡 DHL','🟣 FedEx'].map(l => (
            <span key={l} style={{ fontSize:12, fontWeight:600, color:C.muted, transition:'color .2s' }}
              onMouseOver={e => e.currentTarget.style.color = isDark ? '#fff' : '#1a0b3b'}
              onMouseOut={e  => e.currentTarget.style.color = C.muted}>{l}</span>
          ))}
        </div>
      </div>

      {/* ════════ FEATURES ════════ */}
      <section id="features" style={{ padding:'100px 0' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ marginBottom:52 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#a78bfa', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:18, height:1.5, background:'#a78bfa', display:'block' }} /> Platform capabilities
            </p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,3.6vw,48px)', fontWeight:800, color:C.text, letterSpacing:'-.026em', marginBottom:13 }}>{T.feat_title}</h2>
            <p style={{ fontSize:15.5, color:C.muted, maxWidth:480, lineHeight:1.75, fontWeight:300 }}>{T.feat_sub}</p>
          </div>
          <div className="af-rv af-feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:C.border, border:`1px solid ${C.border}`, borderRadius:22, overflow:'hidden' }}>
            {FEATS.map((f, idx) => (
              <div key={idx} className="hov-lift" style={{ padding:'28px 24px', background:C.bg, transition:'background .22s', borderBottom: idx >= 4 ? 'none' : `1px solid ${C.border}`, borderRight: (idx+1)%4===0 ? 'none' : `1px solid ${C.border}` }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(109,40,217,.06)' : 'rgba(109,40,217,.04)'}
                onMouseOut={e  => (e.currentTarget as HTMLElement).style.background = C.bg}>
                <div style={{ width:42, height:42, borderRadius:11, background:'rgba(109,40,217,.1)', border:'1px solid rgba(109,40,217,.18)', display:'grid', placeItems:'center', fontSize:19, marginBottom:14 }}>{f.e}</div>
                <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:14.5, fontWeight:700, color:C.text, marginBottom:7 }}>{f.t}</div>
                <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.65 }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section id="how" style={{ padding:'100px 0', background: isDark ? 'rgba(255,255,255,.013)' : 'rgba(109,40,217,.025)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ textAlign:'center', marginBottom:60 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:18, height:1.5, background:'#a78bfa', display:'block' }} /> Simple onboarding
            </p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,3.6vw,48px)', fontWeight:800, color:C.text, letterSpacing:'-.026em' }}>{T.how_title}</h2>
          </div>
          <div className="af-rv af-steps" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32, position:'relative' }}>
            <div className="af-steps" style={{ position:'absolute', top:27, left:'12.5%', right:'12.5%', height:1, background:'linear-gradient(90deg,transparent,rgba(109,40,217,.4) 20%,rgba(109,40,217,.4) 80%,transparent)', zIndex:0 }} />
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign:'center', position:'relative', zIndex:1 }} className="af-rv">
                <div style={{ width:54, height:54, borderRadius:'50%', background:G.primary, fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:800, color:'#fff', display:'grid', placeItems:'center', margin:'0 auto 16px', boxShadow:'0 0 28px rgba(109,40,217,.4)' }}>{s.n}</div>
                <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:14.5, fontWeight:700, color:C.text, marginBottom:8 }}>{s.t}</div>
                <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.65 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ INTEGRATIONS ════════ */}
      <section id="integrations" style={{ padding:'100px 0' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ textAlign:'center', marginBottom:52 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:18, height:1.5, background:'#a78bfa', display:'block' }} /> Integrations
            </p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,3.6vw,48px)', fontWeight:800, color:C.text, letterSpacing:'-.026em' }}>{T.int_title}</h2>
          </div>
          {[{lbl:'🇩🇿 Algerian Carriers',chips:['📦 Yalidine','🚚 ZR Express','⚡ Noest','🏷️ Amana','📬 EMS Algeria']},
            {lbl:'🌍 International',chips:['🟡 DHL Express','🟣 FedEx','🟤 UPS','🔵 Aramex']},
            {lbl:'🛒 E-Commerce',chips:['🛍️ Shopify','🛒 WooCommerce','🔶 Magento','🛒 OpenCart','🔧 Custom API']}].map(g => (
            <div key={g.lbl} className="af-rv" style={{ marginBottom:32 }}>
              <div style={{ textAlign:'center', fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:C.muted, fontWeight:600, marginBottom:14 }}>{g.lbl}</div>
              <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10 }}>
                {g.chips.map(c => (
                  <div key={c} className="hov-lift" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', border:`1px solid ${C.border}`, borderRadius:100, background:C.card, fontSize:12.5, fontWeight:500, color:C.muted, transition:'all .2s' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(109,40,217,.4)'; (e.currentTarget as HTMLElement).style.color = isDark ? '#fff' : '#1a0b3b'; }}
                    onMouseOut={e  => { (e.currentTarget as HTMLElement).style.borderColor=C.border; (e.currentTarget as HTMLElement).style.color=C.muted; }}>{c}</div>
                ))}
              </div>
            </div>
          ))}
          {/* Marquee */}
          <div className="af-rv" style={{ overflow:'hidden', marginTop:36, WebkitMaskImage:'linear-gradient(90deg,transparent,currentColor 8%,currentColor 92%,transparent)' }}>
            <div className="mq-track">
              {[...['📦 Yalidine','🚚 ZR Express','⚡ Noest','🏷️ Amana','🟡 DHL','🟣 FedEx','🛍️ Shopify','🛒 WooCommerce','💬 WhatsApp','📱 SMS','📊 Excel','📁 CSV'],
                ...['📦 Yalidine','🚚 ZR Express','⚡ Noest','🏷️ Amana','🟡 DHL','🟣 FedEx','🛍️ Shopify','🛒 WooCommerce','💬 WhatsApp','📱 SMS']].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', border:`1px solid ${C.border}`, borderRadius:100, background:C.card, fontSize:12, fontWeight:500, color:C.muted, whiteSpace:'nowrap' }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ VIP SECTION ════════ */}
      <section style={{ padding:'100px 0', position:'relative', overflow:'hidden', background: isDark ? '#08080f' : '#fdf4ff' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 80% 50%,rgba(249,115,22,.1) 0%,transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 20% 50%,rgba(109,40,217,.08) 0%,transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, maxWidth:1180, margin:'0 auto', padding:'0 40px', textAlign:'center' }}>
          <div className="af-rv" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 20px', borderRadius:100, background:'linear-gradient(90deg,#f59e0b,#f97316)', fontSize:12, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#fff', marginBottom:28 }}>
            👑 {T.vip_badge} ✦
          </div>
          <h2 className="af-rv vip-grad" style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(36px,5vw,68px)', fontWeight:800, letterSpacing:'-.028em', marginBottom:18 }}>{T.vip_title}</h2>
          <p className="af-rv" style={{ fontSize:18, color: isDark ? 'rgba(255,255,255,.55)' : 'rgba(26,11,59,.55)', marginBottom:56, maxWidth:640, margin:'0 auto 56px', fontWeight:300 }}>{T.vip_sub}</p>

          <div className="af-rv af-vip-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:48 }}>
            {VIP_FEATS.map((v, i) => (
              <div key={i} className="hov-lift" style={{ borderRadius:18, padding:'24px 20px', textAlign:'left', background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.8)', border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(249,115,22,.15)', boxShadow: isDark ? 'none' : '0 4px 20px rgba(249,115,22,.06)', transition:'all .22s' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-5px)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(249,115,22,.35)'; }}
                onMouseOut={e  => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.borderColor= isDark ? 'rgba(255,255,255,.08)' : 'rgba(249,115,22,.15)'; }}>
                <div style={{ width:48, height:48, borderRadius:13, background:'linear-gradient(135deg,#f97316,#ec4899)', display:'grid', placeItems:'center', fontSize:22, marginBottom:16 }}>{v.e}</div>
                <div style={{ fontWeight:700, color:C.text, fontSize:13.5, marginBottom:8 }}>{v.t}</div>
                <div style={{ color:C.muted, fontSize:12, lineHeight:1.65 }}>{v.d}</div>
              </div>
            ))}
          </div>

          <button className="af-rv" onClick={() => navigate('/signup')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'15px 44px', borderRadius:100, background:G.vip, color:'#fff', fontSize:16, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 0 40px rgba(249,115,22,.4)', transition:'all .22s' }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 0 64px rgba(249,115,22,.6)'; }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 40px rgba(249,115,22,.4)'; }}>
            👑 {T.vip_cta} →
          </button>
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section id="pricing" style={{ padding:'100px 0' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ textAlign:'center', marginBottom:52 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:18, height:1.5, background:'#a78bfa', display:'block' }} /> Simple pricing
            </p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,3.6vw,48px)', fontWeight:800, color:C.text, letterSpacing:'-.026em', marginBottom:12 }}>{T.price_title}</h2>
            <p style={{ color:C.muted, fontSize:14 }}>{T.price_sub}</p>
          </div>
          <div className="af-rv af-plans" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, maxWidth:980, margin:'0 auto' }}>

            {/* Starter */}
            <div className="hov-lift" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:22, padding:36, display:'flex', flexDirection:'column', transition:'all .28s' }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(109,40,217,.35)'; (e.currentTarget as HTMLElement).style.boxShadow='0 20px 60px rgba(0,0,0,.2)'; }}
              onMouseOut={e  => { (e.currentTarget as HTMLElement).style.borderColor=C.border; (e.currentTarget as HTMLElement).style.boxShadow='none'; }}>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, color:C.text, marginBottom:5 }}>Starter</div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:56, fontWeight:800, color:C.text, marginBottom:4, lineHeight:1 }}>Free</div>
              <div style={{ color:C.muted, fontSize:13, marginBottom:22 }}>10-day free trial</div>
              <ul style={{ flex:1, marginBottom:22 }}>
                {['500 orders','2 stores','5 carriers','Basic analytics','Email support'].map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:9, color:C.muted, fontSize:13, padding:'5px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:'#6d28d9', fontSize:10, width:16, height:16, borderRadius:'50%', background:'rgba(109,40,217,.1)', display:'grid', placeItems:'center', flexShrink:0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/signup')} style={{ width:'100%', padding:13, borderRadius:100, background:G.primary, color:'#fff', fontSize:13.5, fontWeight:600, border:'none', cursor:'pointer', transition:'all .2s', marginBottom:10 }}
                onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform=''}>✦ Start Free Trial</button>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:11, borderRadius:100, background:'rgba(37,211,102,.1)', color:'#25d366', fontSize:13, fontWeight:600, textAlign:'center', border:'1px solid rgba(37,211,102,.22)' }}>💬 {T.wa}</a>
            </div>

            {/* Professional */}
            <div className="hov-lift" style={{ background: isDark ? 'linear-gradient(145deg,rgba(109,40,217,.35),rgba(76,29,149,.25))' : 'linear-gradient(145deg,rgba(109,40,217,.08),rgba(139,92,246,.04))', border:'1px solid rgba(109,40,217,.5)', borderRadius:22, padding:36, display:'flex', flexDirection:'column', position:'relative', transform:'scale(1.03)', boxShadow:'0 0 60px rgba(109,40,217,.15)' }}>
              <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', padding:'4px 14px', borderRadius:100, background:'linear-gradient(90deg,#f59e0b,#f97316)', fontSize:10.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>⭐ Most Popular</div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, color:C.text, marginBottom:5 }}>Professional</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
                <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:50, fontWeight:800, color:C.text, lineHeight:1 }}>20,000</span>
                <span style={{ color:C.muted, fontSize:14 }}>DZD</span>
              </div>
              <div style={{ color:C.muted, fontSize:13, marginBottom:22 }}>for 180 days</div>
              <ul style={{ flex:1, marginBottom:22 }}>
                {['5,000 orders','Unlimited stores','All carriers (DZ + intl)','Advanced analytics','Priority support','Full COD management','Bulk operations','WhatsApp support'].map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:9, color: isDark ? 'rgba(221,217,245,.75)' : 'rgba(26,11,59,.75)', fontSize:13, padding:'5px 0', borderBottom:`1px solid rgba(109,40,217,.12)` }}>
                    <span style={{ color:'#a78bfa', fontSize:10, width:16, height:16, borderRadius:'50%', background:'rgba(167,139,250,.12)', display:'grid', placeItems:'center', flexShrink:0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/signup')} style={{ width:'100%', padding:13, borderRadius:100, background:'#fff', color:'#4c1d95', fontSize:13.5, fontWeight:700, border:'none', cursor:'pointer', transition:'all .2s', marginBottom:10 }}
                onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform=''}>✦ Start Free Trial</button>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:11, borderRadius:100, background:'rgba(255,255,255,.1)', color: isDark ? 'rgba(255,255,255,.7)' : '#6d28d9', fontSize:13, fontWeight:600, textAlign:'center', border:'1px solid rgba(255,255,255,.15)' }}>💬 {T.wa}</a>
            </div>

            {/* VIP Lifetime */}
            <div className="hov-lift" style={{ background:'linear-gradient(145deg,#f97316,#ec4899,#f59e0b)', border:'none', borderRadius:22, padding:36, display:'flex', flexDirection:'column', position:'relative', boxShadow:'0 0 60px rgba(249,115,22,.2)' }}>
              <div style={{ position:'absolute', top:-14, left:16, padding:'4px 12px', borderRadius:100, background:'rgba(0,0,0,.3)', fontSize:10, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>👑 VIP Exclusive</div>
              <div style={{ position:'absolute', top:-14, right:16, padding:'4px 12px', borderRadius:100, background:'rgba(0,0,0,.3)', fontSize:10, fontWeight:700, color:'#fff' }}>✦ SAVE 60%</div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, fontWeight:800, color:'#fff', marginBottom:5 }}>VIP Lifetime</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
                <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:50, fontWeight:800, color:'#fff', lineHeight:1 }}>45,000</span>
                <span style={{ color:'rgba(255,255,255,.75)', fontSize:14 }}>DZD</span>
              </div>
              <div style={{ color:'rgba(255,255,255,.7)', fontSize:13, marginBottom:22 }}>for 5.5 years</div>
              <ul style={{ flex:1, marginBottom:22 }}>
                {['Unlimited orders','Unlimited stores & carriers','All VIP features','Dedicated account manager','24/7 priority WhatsApp','AI shipping optimizer','Custom integrations','White-label branding','Monthly 1:1 training','SLA guarantee 99.9%'].map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'center', gap:9, color:'rgba(255,255,255,.9)', fontSize:13, padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.15)' }}>
                    <span style={{ color:'#fff', fontSize:10, width:16, height:16, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'grid', placeItems:'center', flexShrink:0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/signup')} style={{ width:'100%', padding:13, borderRadius:100, background:'rgba(0,0,0,.3)', color:'#fff', fontSize:13.5, fontWeight:700, border:'none', cursor:'pointer', transition:'all .2s', marginBottom:10 }}
                onMouseOver={e => e.currentTarget.style.background='rgba(0,0,0,.45)'} onMouseOut={e => e.currentTarget.style.background='rgba(0,0,0,.3)'}>✦ Start Free Trial</button>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:11, borderRadius:100, background:'rgba(0,0,0,.2)', color:'#fff', fontSize:13, fontWeight:600, textAlign:'center' }}>💬 {T.wa}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <section id="faq" style={{ padding:'100px 0', background: isDark ? 'rgba(255,255,255,.013)' : 'rgba(109,40,217,.025)' }}>
        <div style={{ maxWidth:820, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ textAlign:'center', marginBottom:52 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#a78bfa', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:18, height:1.5, background:'#a78bfa', display:'block' }} /> Questions?
            </p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,3.6vw,48px)', fontWeight:800, color:C.text, letterSpacing:'-.026em' }}>{T.faq_title}</h2>
          </div>
          {FAQS.map((f, i) => (
            <div key={i} className="af-rv" style={{ borderBottom:`1px solid ${C.border}` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width:'100%', background:'none', border:'none', color:C.text, fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:15.5, fontWeight:700, textAlign: isRTL ? 'right' : 'left', padding:'20px 0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, transition:'color .18s' }}
                onMouseOver={e => e.currentTarget.style.color='#a78bfa'} onMouseOut={e => e.currentTarget.style.color=C.text}>
                {f.q}
                <span style={{ fontSize:20, color:C.muted, transition:'transform .3s', transform: openFaq===i ? 'rotate(45deg)' : '', flexShrink:0, display:'inline-block' }}>+</span>
              </button>
              {openFaq === i && <div style={{ paddingBottom:20, fontSize:14.5, color:C.muted, lineHeight:1.78, fontWeight:300 }}>{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section style={{ padding:'80px 0' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-rv" style={{ background: isDark ? 'linear-gradient(135deg,rgba(109,40,217,.14),rgba(139,92,246,.08),rgba(6,182,212,.05))' : 'linear-gradient(135deg,rgba(109,40,217,.08),rgba(139,92,246,.05),rgba(6,182,212,.03))', border:`1px solid ${isDark ? 'rgba(109,40,217,.22)' : 'rgba(109,40,217,.2)'}`, borderRadius:28, padding:'72px 60px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(109,40,217,.06) 1.5px,transparent 1.5px)', backgroundSize:'24px 24px' }} />
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,4.2vw,52px)', fontWeight:800, color:C.text, letterSpacing:'-.025em', marginBottom:16, position:'relative' }}>{T.cta2}</h2>
            <p style={{ fontSize:16, color:C.muted, marginBottom:34, position:'relative', fontWeight:300 }}>{T.cta2_sub}</p>
            <div style={{ display:'flex', justifyContent:'center', gap:13, flexWrap:'wrap', position:'relative' }}>
              <button onClick={() => navigate('/signup')} style={{ padding:'14px 34px', borderRadius:100, background:G.primary, color:'#fff', fontSize:15, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 0 40px rgba(109,40,217,.3)', transition:'all .22s' }}
                onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform=''}>Start Free Trial →</button>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" style={{ padding:'14px 34px', borderRadius:100, background:G.wa, color:'#fff', fontSize:15, fontWeight:700, display:'inline-flex', alignItems:'center', gap:7, transition:'all .22s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'} onMouseOut={e => (e.currentTarget as HTMLElement).style.transform=''}>💬 {T.wa}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer style={{ borderTop:`1px solid ${C.border}`, background: isDark ? 'rgba(3,3,12,.8)' : 'rgba(245,243,255,.8)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 40px' }}>
          <div className="af-footer-top" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:44, padding:'68px 0 52px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:G.primary, display:'grid', placeItems:'center', color:'#fff', fontWeight:900 }}>✦</div>
                <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:19, fontWeight:800, color:C.text }}>auto<span style={{ color:'#a78bfa' }}>flow</span></span>
              </div>
              <p style={{ fontSize:13, color:C.muted, lineHeight:1.72, marginBottom:18, maxWidth:300, fontWeight:300 }}>Algeria's leading logistics automation platform. Connect every carrier, automate every order, grow every day.</p>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:100, background:G.wa, color:'#fff', fontSize:13, fontWeight:600 }}>💬 {T.wa}</a>
            </div>
            {[{h:'Product',ls:[['#features','Features'],['#pricing','Pricing'],['#integrations','Integrations'],['/demo','Live Demo']]},
              {h:'Company',ls:[['/about','About'],['/blog','Blog'],['#','Careers'],['/press','Press']]},
              {h:'Support',ls:[['https://wa.me/213794157508','WhatsApp'],['/docs','Docs'],['/status','Status'],['/contact','Contact']]}].map(col => (
              <div key={col.h}>
                <h4 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>{col.h}</h4>
                <ul style={{ listStyle:'none' }}>
                  {col.ls.map(([h,l]) => (
                    <li key={l} style={{ marginBottom:9 }}>
                      <a href={h} style={{ fontSize:13, color:C.muted, transition:'color .18s', fontWeight:300 }}
                        onMouseOver={e => e.currentTarget.style.color = isDark ? '#fff' : '#1a0b3b'}
                        onMouseOut={e  => e.currentTarget.style.color = C.muted}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, padding:'22px 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <p style={{ fontSize:12, color:C.muted }}>© 2025 autoflow. All rights reserved.</p>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {['✅ 99.9% SLA','✅ SOC 2','✅ GDPR','✅ EU Data'].map(b => (
                <span key={b} style={{ fontSize:11.5, color:C.muted }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ════════ FLOATING WA ════════ */}
      <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer" className="wa-pulse"
        style={{ position:'fixed', bottom:24, right:24, zIndex:500, width:56, height:56, borderRadius:'50%', background:G.wa, display:'grid', placeItems:'center', fontSize:26, transition:'transform .2s', boxShadow:'0 4px 20px rgba(37,211,102,.4)' }}
        onMouseOver={e => e.currentTarget.style.transform='scale(1.12)'}
        onMouseOut={e  => e.currentTarget.style.transform=''}>💬</a>

      {/* Scroll-to-top */}
      {scrolled && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ position:'fixed', bottom:24, right:92, zIndex:500, width:40, height:40, borderRadius:'50%', background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(109,40,217,.1)', border:`1px solid ${C.border}`, color:C.text, fontSize:14, cursor:'pointer', display:'grid', placeItems:'center', backdropFilter:'blur(8px)', transition:'all .2s' }}
          onMouseOver={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.15)' : 'rgba(109,40,217,.2)'}
          onMouseOut={e  => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.08)' : 'rgba(109,40,217,.1)'}>↑</button>
      )}
    </div>
  );
}
