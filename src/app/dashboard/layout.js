'use client';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Database, Users, Settings, CreditCard, LogOut, Zap, Globe, Menu, X, ShieldAlert, Building, UserPlus, Handshake, Bell, ChevronDown, Palette, Type, AlignLeft, ChevronRight, CalendarDays, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Inactive');
  const [planName, setPlanName] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [impersonatedEmail, setImpersonatedEmail] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [websiteType, setWebsiteType] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [unreadLeadsCount, setUnreadLeadsCount] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [headerAvatar, setHeaderAvatar] = useState(null); // url or null
  const [profileUploading, setProfileUploading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [botColor, setBotColor] = useState('#0EA5E9');
  const [botDisplayName, setBotDisplayName] = useState('');
  const [botWelcome, setBotWelcome] = useState('');
  const [botId, setBotId] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const checkAuthAndSub = async () => {
      const urlDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
      if (urlDemo) {
        localStorage.setItem('isDemo', 'true');
      }
      const isDemo = urlDemo || localStorage.getItem('isDemo') === 'true';

      if (isDemo) {
        setUserEmail('demo@realtypropflow.com');
        setSubscriptionStatus('Active');
        setPlanName('premium');
        setWebsiteType('Real Estate');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      } else {
        if (session.user.email?.toLowerCase() === 'irfangull2288@gmail.com' && !localStorage.getItem('impersonated_user_email')) {
          router.push('/superadmin');
          return;
        }
        const impEmail = localStorage.getItem('impersonated_user_email');
        if (impEmail) {
          setImpersonatedEmail(impEmail);
          setUserEmail(impEmail);
        } else {
          setUserEmail(session.user.email);
        }
        
        // Industry selection modal removed per user request (defaults to Real Estate)
        const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
        
        const { data: rows } = await supabase
          .from('users_subscription')
          .select('status, trial_ends_at, plan, billing_cycle')
          .eq('user_id', userId)
          .limit(1);
        const sub = rows?.[0];

        if (session.user.email === 'demo@gmail.com') {
          setSubscriptionStatus('Active');
          setPlanName('premium');
          setWebsiteType('Real Estate');
          setLoading(false);
          return;
        }

        if (sub) {
          setSubscriptionStatus(sub.status);
          setPlanName(sub.plan || 'starter');
          setBillingCycle(sub.billing_cycle || 'monthly');
          if (sub.trial_ends_at) {
            const daysLeft = Math.ceil((new Date(sub.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
          } else {
            setTrialDaysLeft(0);
          }
        } else {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);
          await supabase.from('users_subscription').insert({
            user_id: userId,
            status: 'Trialing',
            plan: 'free',
            email: impEmail || session.user.email,
            trial_ends_at: trialEndsAt.toISOString()
          });
          setSubscriptionStatus('Trialing');
          setPlanName('free');
        }
        setLoading(false);
      }
    };
    checkAuthAndSub();

    const interval = setInterval(async () => {
      const isDemo = localStorage.getItem('isDemo') === 'true';
      if (isDemo) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      if (session.user.email === 'demo@gmail.com') return;

      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
      const { data: sub, error } = await supabase
        .from('users_subscription')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!sub || error) {
        await supabase.auth.signOut();
        router.push('/login');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const handleSignOut = async () => {
    if (localStorage.getItem('isDemo') === 'true') {
      localStorage.removeItem('isDemo');
      router.push('/login');
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Fetch unread leads count + agent name for top header
  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const isDemo = localStorage.getItem('isDemo') === 'true';
        if (isDemo) {
          setAgentName('Demo Agent');
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

        // Get bot settings, display name, and avatar
        const { data: bots } = await supabase
          .from('bots')
          .select('id, name, primary_color, welcome_message, bot_avatar')
          .eq('user_id', userId)
          .limit(1);

        if (bots && bots.length > 0) {
          const b = bots[0];
          setBotId(b.id);
          setAgentName(b.name || '');
          if (b.primary_color) setBotColor(b.primary_color);
          if (b.name) setBotDisplayName(b.name);
          if (b.welcome_message) setBotWelcome(b.welcome_message);
          const dashAvatar = session.user?.user_metadata?.dashboard_avatar || localStorage.getItem('dashboard_avatar');
          if (dashAvatar) {
            setHeaderAvatar(dashAvatar);
          } else if (b.bot_avatar && (b.bot_avatar.startsWith('http') || b.bot_avatar.startsWith('/'))) {
            setHeaderAvatar(b.bot_avatar);
          }
          const botIds = bots.map(b => b.id);

          // Count unread (New Lead) leads
          const { count } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .in('bot_id', botIds)
            .eq('status', 'New Lead');
          setUnreadLeadsCount(count || 0);
        }
      } catch (err) { console.error(err); }
    };

    fetchHeaderData();
    const poll = setInterval(fetchHeaderData, 60000);
    return () => clearInterval(poll);
  }, [userEmail]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  const handleSaveWebsiteType = async () => {
    setOnboardingLoading(true);
    await supabase.auth.updateUser({ data: { website_type: websiteType } });
    setShowOnboarding(false);
    setOnboardingLoading(false);
  };


  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'CRM Leads', path: '/dashboard/leads', icon: <Users size={20} /> },
    { name: 'Calendar', path: '/dashboard/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Properties', path: '/dashboard/properties', icon: <Building size={20} /> },
    { name: 'My Profile', path: '/dashboard/profile', icon: <UserPlus size={20} /> },
    { name: 'Knowledge Base', path: '/dashboard/knowledge', icon: <Database size={20} /> },
    { name: 'Chat History', path: '/dashboard/chat-history', icon: <MessageSquare size={20} /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} /> },
    { name: 'Plans & Billing', path: '/dashboard/plans', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>

      {/* Mobile Sidebar Toggle Button */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>

      {/* Overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      
      {/* Ultra Premium Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}`} style={{ width: sidebarOpen ? '280px' : '0px', minWidth: sidebarOpen ? '280px' : '0px', backgroundColor: 'var(--bg-sidebar)', borderRight: sidebarOpen ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
        
        {/* Glow behind Sidebar */}
        <div style={{ position: 'absolute', top: '10%', left: '-50%', width: '100%', height: '50%', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }}></div>

        {/* Logo Area */}
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '280px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '8px', display: 'flex', boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
            <img src="/logo-icon.png" alt="Logo" style={{ height: '22px', width: '22px', objectFit: 'contain' }} />
          </div>
          {/* Close / Collapse button */}
          <button 
            onClick={() => setSidebarOpen(false)} 
            title="Collapse Sidebar"
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-muted)', 
              cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center',
              borderRadius: '8px', transition: 'all 0.2s' 
            }} 
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '12px', marginTop: '16px' }}>Main Menu</div>
          
          {navItems.map((item) => {
            const exactMatchPaths = ['/dashboard', '/dashboard/profile'];
            const isActive = pathname === item.path || (!exactMatchPaths.includes(item.path) && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)} style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', 
                color: isActive ? 'white' : 'var(--text-secondary)', 
                backgroundColor: isActive ? 'rgba(255,255,255,0.03)' : 'transparent', 
                textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: isActive ? '600' : '500',
                border: isActive ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
              >
                {isActive && (
                  <motion.div layoutId="active-nav" style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: 'var(--primary)', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--primary)' }} />
                )}
                <span style={{ color: isActive ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center', zIndex: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '14px', zIndex: 1 }}>{item.name}</span>
              </Link>
            )
          })}
          
          <div style={{ margin: '24px 0 8px', borderTop: '1px solid var(--border)' }}></div>

          {/* Visit Main Website Link */}
          <a
            href="https://www.realtypropflow.com/?view=website"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: '12px', color: 'var(--text-secondary)', backgroundColor: 'transparent',
              textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: '500',
              border: '1px solid transparent', marginBottom: '4px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Globe size={20} />
            </span>
            <span style={{ fontSize: '14px' }}>Visit Website</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.5 }}>↗</span>
          </a>

        </div>

        {/* User Profile Area */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #818CF8, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px', flexShrink: 0, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userEmail || 'Admin User'}</div>
              <div style={{ fontSize: '12px', color: 'var(--success)' }}>Active Workspace</div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main" style={{ flex: 1, padding: '0', overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top Header Bar ── */}
        {/* Close dropdown on outside click */}
        {showProfileMenu && <div onClick={() => { setShowProfileMenu(false); setShowSettingsPanel(false); }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}

        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 32px',
          backgroundColor: 'rgba(5,5,5,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(201,162,39,0.12)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.4)'
        }}>

          {/* LEFT: Toggle Button + Mobile Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,162,39,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: sidebarOpen ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(201,162,39,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = sidebarOpen ? 'var(--primary)' : 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(201,162,39,0.22)'; }}
            >
              <Menu size={18} />
            </button>

            <Link href="/dashboard" className="mobile-only-brand" style={{ display: 'none', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo-icon.png" alt="Logo" style={{ height: '22px', width: '22px', objectFit: 'contain' }} />
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>PropFlow</span>
            </Link>
          </div>

          {/* RIGHT: Agent name + Bell + Avatar(dropdown) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {/* Agent / Realtor Name */}
            {agentName && (
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {agentName}
              </span>
            )}

            {/* Divider */}
            <div style={{ width: '1px', height: '22px', background: 'rgba(201,162,39,0.18)' }} />

            {/* Notification Bell */}
            <Link href="/dashboard/leads" title="New Leads" style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${unreadLeadsCount > 0 ? 'rgba(201,162,39,0.5)' : 'rgba(201,162,39,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: unreadLeadsCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
              textDecoration: 'none', transition: 'all 0.2s', position: 'relative', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(201,162,39,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = unreadLeadsCount > 0 ? 'var(--primary)' : 'var(--text-muted)'; e.currentTarget.style.borderColor = unreadLeadsCount > 0 ? 'rgba(201,162,39,0.5)' : 'rgba(201,162,39,0.15)'; }}
            >
              <Bell size={16} />
              {unreadLeadsCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  minWidth: '18px', height: '18px', borderRadius: '9px',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  color: 'white', fontSize: '10px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #050505', padding: '0 3px',
                  boxShadow: '0 0 8px rgba(239,68,68,0.6)'
                }}>
                  {unreadLeadsCount > 99 ? '99+' : unreadLeadsCount}
                </span>
              )}
            </Link>

            {/* Divider */}
            <div style={{ width: '1px', height: '22px', background: 'rgba(201,162,39,0.18)' }} />

            {/* Profile Avatar with Dropdown - on the far right */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { setShowProfileMenu(v => !v); setShowSettingsPanel(false); }}
                title="Menu"
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: headerAvatar ? 'transparent' : 'linear-gradient(135deg, #C9A227, #4F46E5)',
                  border: '2px solid rgba(201,162,39,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: '800', fontSize: '14px',
                  boxShadow: '0 0 10px rgba(201,162,39,0.2)',
                  overflow: 'hidden', cursor: 'pointer', padding: 0
                }}
              >
                {headerAvatar
                  ? <img src={headerAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (agentName ? agentName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U'))
                }
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: showSettingsPanel ? '280px' : '220px',
                  backgroundColor: '#111111',
                  border: '1px solid rgba(201,162,39,0.2)',
                  borderRadius: '14px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                  zIndex: 100, overflow: 'hidden'
                }}>

                  {!showSettingsPanel ? (
                    <>
                      {/* User Info Header */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ cursor: 'pointer', flexShrink: 0 }} title="Change photo">
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setProfileUploading(true);
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const uid = localStorage.getItem('impersonated_user_id') || session?.user?.id;
                              if (!uid) return;
                              const ext = file.name.split('.').pop();
                              const path = `avatars/${uid}/header_avatar_${Date.now()}.${ext}`;
                              await supabase.storage.from('bot_avatars').upload(path, file, { upsert: true });
                              const { data: { publicUrl } } = supabase.storage.from('bot_avatars').getPublicUrl(path);
                              setHeaderAvatar(publicUrl);
                              if (botId) {
                                await supabase.from('bots').update({ bot_avatar: publicUrl }).eq('id', botId);
                              }
                            } catch(err) { console.error(err); }
                            setProfileUploading(false);
                          }} />
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: headerAvatar ? 'transparent' : 'linear-gradient(135deg, #C9A227, #4F46E5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: '800', fontSize: '14px',
                            border: '2px solid rgba(201,162,39,0.3)', overflow: 'hidden', position: 'relative'
                          }}>
                            {headerAvatar ? <img src={headerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (agentName ? agentName.charAt(0).toUpperCase() : (userEmail ? userEmail.charAt(0).toUpperCase() : 'U'))}
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                            >📷</div>
                          </div>
                        </label>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agentName || 'Agent'}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
                        </div>
                      </div>

                      {/* Nav Links */}
                      {[
                        { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={15} /> },
                        { label: 'My Profile', href: '/dashboard/profile', icon: <UserPlus size={15} /> },
                        { label: 'CRM Leads', href: '/dashboard/leads', icon: <Users size={15} /> },
                        { label: 'Properties', href: '/dashboard/properties', icon: <Building size={15} /> },
                        { label: 'Knowledge Base', href: '/dashboard/knowledge', icon: <Database size={15} /> },
                        { label: 'Chat History', href: '/dashboard/chat-history', icon: <MessageSquare size={15} /> },
                        { label: 'Plans & Subscription', href: '/dashboard/plans', icon: <CreditCard size={15} /> },
                      ].map(item => (
                        <Link key={item.href} href={item.href}
                          onClick={() => setShowProfileMenu(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', textDecoration: 'none',
                            color: pathname === item.href ? 'var(--primary)' : 'rgba(255,255,255,0.65)',
                            fontSize: '13px', fontWeight: '500',
                            borderLeft: pathname === item.href ? '2px solid var(--primary)' : '2px solid transparent',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.06)'; e.currentTarget.style.color = 'white'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = pathname === item.href ? 'var(--primary)' : 'rgba(255,255,255,0.65)'; }}
                        >
                          <span style={{ opacity: 0.7 }}>{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}

                      {/* Settings */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Link
                          href="/dashboard/settings"
                          onClick={() => setShowProfileMenu(false)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                            color: pathname === '/dashboard/settings' ? 'var(--primary)' : 'rgba(255,255,255,0.65)',
                            fontSize: '13px', fontWeight: '500', textDecoration: 'none',
                            borderLeft: pathname === '/dashboard/settings' ? '2px solid var(--primary)' : '2px solid transparent',
                            justifyContent: 'flex-start', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.06)'; e.currentTarget.style.color = 'white'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = pathname === '/dashboard/settings' ? 'var(--primary)' : 'rgba(255,255,255,0.65)'; }}
                        >
                          <span style={{ opacity: 0.7 }}><Settings size={15} /></span>
                          Settings & Customization
                          <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                        </Link>
                        <button
                          onClick={() => { handleSignOut(); setShowProfileMenu(false); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(239,68,68,0.75)', fontSize: '13px', fontWeight: '500',
                            borderLeft: '2px solid transparent', justifyContent: 'flex-start', transition: 'all 0.15s',
                            marginBottom: '4px'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.75)'; }}
                        >
                          <span style={{ opacity: 0.85 }}><LogOut size={15} /></span>
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Settings Sub-Panel */
                    <>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setShowSettingsPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Chatbot Settings</span>
                      </div>

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Brand Color */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                            <Palette size={12} /> Brand Color
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="color" value={botColor} onChange={e => setBotColor(e.target.value)}
                              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '2px solid rgba(201,162,39,0.25)', cursor: 'pointer', padding: '2px', background: 'none' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{botColor}</span>
                          </div>
                        </div>

                        {/* Chatbot Display Name */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                            <Type size={12} /> Chatbot Name
                          </label>
                          <input
                            value={botDisplayName}
                            onChange={e => setBotDisplayName(e.target.value)}
                            placeholder="e.g. Sandra's Assistant"
                            style={{
                              width: '100%', padding: '8px 10px', borderRadius: '8px',
                              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,162,39,0.2)',
                              color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Welcome Message */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                            <AlignLeft size={12} /> Welcome Message
                          </label>
                          <textarea
                            value={botWelcome}
                            onChange={e => setBotWelcome(e.target.value)}
                            placeholder="Hi! How can I help you today?"
                            rows={3}
                            style={{
                              width: '100%', padding: '8px 10px', borderRadius: '8px',
                              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,162,39,0.2)',
                              color: 'white', fontSize: '13px', outline: 'none',
                              resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        {/* Save Button */}
                        <button
                          disabled={savingSettings}
                          onClick={async () => {
                            if (!botId) return;
                            setSavingSettings(true);
                            try {
                              await supabase.from('bots').update({
                                primary_color: botColor,
                                name: botDisplayName,
                                welcome_message: botWelcome
                              }).eq('id', botId);
                              setAgentName(botDisplayName);
                              setSettingsSaved(true);
                              setTimeout(() => setSettingsSaved(false), 2500);
                            } catch(e) { console.error(e); }
                            setSavingSettings(false);
                          }}
                          style={{
                            width: '100%', padding: '9px', borderRadius: '9px',
                            background: settingsSaved ? '#10B981' : 'linear-gradient(135deg, #C9A227, #a07c1a)',
                            color: 'white', fontWeight: '700', fontSize: '13px',
                            border: 'none', cursor: savingSettings ? 'wait' : 'pointer',
                            opacity: savingSettings ? 0.7 : 1, transition: 'all 0.2s'
                          }}
                        >
                          {savingSettings ? 'Saving...' : settingsSaved ? '✅ Saved!' : 'Save Settings'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
        {/* ── End Top Header ── */}

        <div style={{ flex: 1, padding: '40px 56px', position: 'relative' }}>
        {impersonatedEmail && (
          <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              You are impersonating {impersonatedEmail}
            </div>
            <button onClick={() => {
              localStorage.removeItem('impersonated_user_id');
              localStorage.removeItem('impersonated_user_email');
              window.location.href = '/superadmin';
            }} style={{ padding: '6px 12px', backgroundColor: '#92400E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Exit Impersonation
            </button>
          </div>
        )}

        {/* ⏰ Trial Countdown Banner */}
        {subscriptionStatus && subscriptionStatus.toLowerCase() !== 'active' && (subscriptionStatus.toLowerCase() !== 'inactive' || trialDaysLeft !== null) && (
          <div style={{
            background: subscriptionStatus.toLowerCase() === 'inactive' ? 'rgba(239,68,68,0.05)' : 'rgba(79,70,229,0.05)',
            border: `1px solid ${
              subscriptionStatus.toLowerCase() === 'inactive' ? 'rgba(239,68,68,0.3)'
              : trialDaysLeft <= 3 ? 'rgba(239,68,68,0.3)'
              : trialDaysLeft <= 7 ? 'rgba(245,158,11,0.3)'
              : 'rgba(79,70,229,0.3)'
            }`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            boxShadow: subscriptionStatus.toLowerCase() === 'inactive' ? '0 8px 25px rgba(239,68,68,0.15)' : '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0,
                background: subscriptionStatus.toLowerCase() === 'inactive' ? 'rgba(239,68,68,0.2)' : trialDaysLeft <= 3 ? 'rgba(239,68,68,0.2)' : trialDaysLeft <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(79,70,229,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
              }}>
                {subscriptionStatus.toLowerCase() === 'inactive' ? '🔒' : trialDaysLeft <= 3 ? '🔴' : trialDaysLeft <= 7 ? '🟡' : '🕐'}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>
                  {subscriptionStatus.toLowerCase() === 'inactive'
                    ? '⛔ Your 15-day free trial has ended. Your chatbot is now paused.'
                    : trialDaysLeft === 0
                    ? '⛔ Last Day! Your trial ends today'
                    : trialDaysLeft === 1
                    ? '⚠️ Trial ends tomorrow — 1 day left!'
                    : `🗓️ Free Trial Active — ${trialDaysLeft} days remaining`
                  }
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                  {subscriptionStatus.toLowerCase() === 'inactive'
                    ? 'Your chatbot visitors are seeing a paused message. Purchase a plan below to reactivate instantly.'
                    : 'Upgrade now to ensure your chatbot never stops working for your visitors.'
                  }
                </div>
              </div>
            </div>
            {subscriptionStatus !== 'Active' && (
              <a href="/dashboard/plans" style={{
                padding: '12px 28px',
                background: subscriptionStatus === 'Inactive' || trialDaysLeft <= 3
                  ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                  : 'linear-gradient(135deg, #C9A227, #F59E0B)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {subscriptionStatus === 'Inactive' ? '🔓 Purchase a Plan' : '⚡ Upgrade Plan'}
              </a>
            )}
          </div>
        )}

          <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.05, pointerEvents: 'none' }}></div>
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (CloseFlow Style) ── */}
      <nav className="mobile-bottom-nav">
        {[
          { name: 'Home', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
          { name: 'Leads', path: '/dashboard/leads', icon: <Users size={20} /> },
          { name: 'Calendar', path: '/dashboard/calendar', icon: <CalendarDays size={20} /> },
          { name: 'Properties', path: '/dashboard/properties', icon: <Building size={20} /> },
          { name: 'More', isAction: true, action: () => setSidebarOpen(true), icon: <MoreHorizontal size={20} /> }
        ].map((tab, idx) => {
          const isActive = !tab.isAction && (
            tab.path === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(tab.path)
          );

          if (tab.isAction) {
            return (
              <button
                key={idx}
                onClick={tab.action}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '4px', flex: 1, padding: '6px 0',
                  color: sidebarOpen ? 'var(--primary)' : '#94A3B8',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: sidebarOpen ? '700' : '600' }}>{tab.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={idx}
              href={tab.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px', flex: 1, padding: '6px 0', textDecoration: 'none',
                color: isActive ? 'var(--primary)' : '#94A3B8',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ 
                transform: isActive ? 'scale(1.12)' : 'scale(1)', 
                transition: 'transform 0.15s ease',
                color: isActive ? 'var(--primary)' : 'inherit'
              }}>
                {tab.icon}
              </span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#FFFFFF' : 'inherit'
              }}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

