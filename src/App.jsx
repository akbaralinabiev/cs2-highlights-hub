import React, { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import {
  Activity, ArrowLeft, Check, ChevronDown, CircleUserRound, Clapperboard,
  Crosshair, Database, Eye, Film, Filter, Gamepad2, Grid2X2, HardDrive,
  LayoutDashboard, LogOut, Plus, Search, Settings, ShieldCheck, Star,
  Trash2, UploadCloud, Video, X
} from "lucide-react";

const initialClips = [
  { id: 1, title: "Triple threat", round: 20, score: "7:13", map: "Mirage", date: "8 Nov 2026", tags: ["3K"], color: "blue", featured: true },
  { id: 2, title: "Carried the round", round: 7, score: "7:13", map: "Mirage", date: "8 Nov 2026", tags: ["3K"], color: "blue" },
  { id: 3, title: "Clutched a 1v2 situation", round: 5, score: "13:7", map: "Mirage", date: "8 Nov 2026", tags: ["1v2 clutch"], color: "cyan" },
  { id: 4, title: "Clutched a 1v2 situation", round: 4, score: "13:7", map: "Mirage", date: "8 Nov 2026", tags: ["1v2 clutch"], color: "cyan" },
  { id: 5, title: "Triple kill", round: 3, score: "13:7", map: "Mirage", date: "8 Nov 2026", tags: ["3K", "1v3 clutch"], color: "blue" },
  { id: 6, title: "Three frags, one round", round: 14, score: "13:4", map: "Cache", date: "8 Nov 2026", tags: ["3K"], color: "blue" },
  { id: 7, title: "Triple threat", round: 8, score: "13:4", map: "Cache", date: "8 Nov 2026", tags: ["3K"], color: "blue" },
  { id: 8, title: "Triple kill", round: 3, score: "3:13", map: "Nuke", date: "8 Nov 2026", tags: ["3K"], color: "blue" },
  { id: 9, title: "Clean retake", round: 11, score: "13:9", map: "Ancient", date: "7 Nov 2026", tags: ["Retake"], color: "green" },
  { id: 10, title: "Last-second defuse", round: 22, score: "16:14", map: "Inferno", date: "6 Nov 2026", tags: ["Clutch"], color: "cyan" },
  { id: 11, title: "No time to reload", round: 18, score: "13:10", map: "Dust II", date: "5 Nov 2026", tags: ["Ace"], color: "orange" },
  { id: 12, title: "The opening pick", round: 2, score: "13:6", map: "Anubis", date: "4 Nov 2026", tags: ["Entry"], color: "blue" }
];

const maps = ["All maps", "Mirage", "Cache", "Nuke", "Ancient", "Inferno", "Dust II", "Anubis"];

function ClipCard({ clip, onOpen, admin, onDelete, onFeature }) {
  return (
    <article className="clip-card">
      <button className="video-preview" onClick={() => onOpen(clip)} aria-label={`Open ${clip.title}`}>
        <div className="preview-top">
          <span className="quality-pill">2D</span>
          {admin && <span className="star-button" onClick={(e) => { e.stopPropagation(); onFeature?.(clip.id); }} title="Feature clip">
            <Star size={15} fill={clip.featured ? "currentColor" : "none"} />
          </span>}
        </div>
        <div className="preview-center">
          <span className="play-circle"><span /></span>
          <span className="preview-hint">VIDEO PREVIEW</span>
        </div>
        {admin && <span className="delete-button" onClick={(e) => { e.stopPropagation(); onDelete(clip.id); }} title="Delete clip"><Trash2 size={15}/></span>}
        <span className="play-overlay"><span className="play-triangle">▶</span></span>
      </button>
      <div className="clip-info">
        <div className="clip-title-line">
          <h3>{clip.title}</h3>
          <span className="round">Round {clip.round}</span>
        </div>
        <div className="tags">
          {clip.tags.map((tag) => <span key={tag} className={`tag ${tag.toLowerCase().includes("clutch") ? "tag-cyan" : tag === "Ace" ? "tag-orange" : ""}`}>{tag.includes("clutch") && "● "}{tag}</span>)}
        </div>
        <div className="clip-divider" />
        <div className="clip-meta">
          <strong className={clip.score.startsWith("13") || clip.score.startsWith("16") ? "score-win" : "score-loss"}>{clip.score}</strong>
          <span className="map-name"><span className="map-emblem">✦</span>{clip.map}</span>
          <span className="clip-date">{clip.date}</span>
        </div>
      </div>
    </article>
  );
}

function Modal({ clip, onClose }) {
  if (!clip) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-video"><Video size={42}/><p>Video player will appear here</p><small>Connect your video storage to enable playback.</small></div>
        <div className="modal-content">
          <div><span className="eyebrow">{clip.map} · Round {clip.round}</span><h2>{clip.title}</h2></div>
          <span className="score-chip">{clip.score}</span>
        </div>
        <div className="tags">{clip.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [map, setMap] = useState("Mirage");
  const [round, setRound] = useState("1");
  const [score, setScore] = useState("13:7");
  const [tag, setTag] = useState("3K");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title for this highlight.");
    onAdd({ title: title.trim(), map, round: Number(round) || 1, score, tags: [tag], color: "blue", date: "Draft", fileName: file?.name });
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="eyebrow">CONTENT LIBRARY</span><h2>New highlight</h2></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit}>
          <label className="drop-zone">
            <UploadCloud size={27}/>
            <strong>{file ? file.name : "Choose a video file"}</strong>
            <span>{file ? "Selected for this UI demo" : "MP4, WebM or MOV · files up to 200 MB in the planned setup"}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div className="field"><label htmlFor="title">Highlight title</label><input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 1v3 clutch on Mirage" /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="map">Map</label><select id="map" value={map} onChange={e => setMap(e.target.value)}>{maps.slice(1).map(m => <option key={m}>{m}</option>)}</select></div>
            <div className="field"><label htmlFor="round">Round</label><input id="round" type="number" min="1" max="60" value={round} onChange={e => setRound(e.target.value)} /></div>
            <div className="field"><label htmlFor="score">Match score</label><input id="score" value={score} onChange={e => setScore(e.target.value)} placeholder="13:7" /></div>
            <div className="field"><label htmlFor="tag">Highlight type</label><select id="tag" value={tag} onChange={e => setTag(e.target.value)}>{["3K", "4K", "Ace", "1v2 clutch", "1v3 clutch", "Clutch", "Entry", "Retake"].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="demo-warning"><ShieldCheck size={16}/><span>This is a frontend prototype. The selected video is not uploaded or saved yet.</span></div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Plus size={16}/> Add draft</button></div>
        </form>
      </div>
    </div>
  );
}

function AdminView({ clips, onBack, onSignOut, authError, onUpload, onDelete, onFeature }) {
  const [section, setSection] = useState("Overview");
  const nav = [
    { name: "Overview", icon: LayoutDashboard }, { name: "Highlights", icon: Clapperboard },
    { name: "Uploads", icon: UploadCloud }, { name: "Settings", icon: Settings }
  ];
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={onBack}><span className="brand-mark"><Crosshair size={19}/></span><span>CLUTCH<span className="brand-muted">ARCHIVE</span></span></button>
        <div className="sidebar-label">WORKSPACE</div>
        {nav.map(item => <button key={item.name} className={`nav-item ${section === item.name ? "active" : ""}`} onClick={() => setSection(item.name)}><item.icon size={17}/>{item.name}{item.name === "Highlights" && <span className="nav-count">{clips.length}</span>}</button>)}
        <div className="sidebar-bottom"><div className="admin-avatar"><CircleUserRound size={20}/></div><div className="admin-user"><strong>Administrator</strong><span>Owner workspace</span></div><button className="icon-button" onClick={onSignOut} title="Sign out"><LogOut size={16}/></button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>{section}</strong></div><div className="admin-top-actions"><span className="private-badge"><ShieldCheck size={13}/> PRIVATE PREVIEW</span><button className="site-link" onClick={onBack}><Eye size={15}/> View website</button></div></header>
        <div className="admin-page">
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          {section === "Overview" && <>
            <div className="page-title-row"><div><span className="eyebrow">YOUR PERSONAL LIBRARY</span><h1>Dashboard</h1><p className="subheading">Your CS2 moments, organized in one place.</p></div><button className="primary-button" onClick={onUpload}><Plus size={16}/> Add highlight</button></div>
            <div className="stat-grid"><div className="stat-card"><span className="stat-icon"><Film size={18}/></span><span className="stat-label">TOTAL HIGHLIGHTS</span><strong>{clips.length}</strong><small>In your library</small></div><div className="stat-card"><span className="stat-icon"><Star size={18}/></span><span className="stat-label">FEATURED CLIPS</span><strong>{clips.filter(c => c.featured).length}</strong><small>Shown as favorites</small></div><div className="stat-card"><span className="stat-icon"><Database size={18}/></span><span className="stat-label">STORAGE STATUS</span><strong>Not connected</strong><small>Connect storage to upload</small></div></div>
            <div className="section-heading"><div><h2>Recent highlights</h2><p>Manage your latest clips</p></div><button className="text-button" onClick={() => setSection("Highlights")}>View all <ArrowLeft className="arrow-right" size={14}/></button></div>
            <div className="admin-list">{clips.slice(0, 5).map(c => <div className="admin-list-row" key={c.id}><div className="mini-video"><Video size={17}/></div><div className="list-title"><strong>{c.title}</strong><span>{c.map} · Round {c.round}</span></div><span className="list-score">{c.score}</span><span className="draft-pill">{c.date === "Draft" ? "Draft" : "Published demo"}</span><button className="icon-button danger-quiet" onClick={() => onDelete(c.id)}><Trash2 size={15}/></button></div>)}</div>
          </>}
          {section === "Highlights" && <><div className="page-title-row"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>Highlights</h1><p className="subheading">Edit, feature or remove clips.</p></div><button className="primary-button" onClick={onUpload}><Plus size={16}/> Add highlight</button></div><div className="admin-grid">{clips.map(c => <ClipCard key={c.id} clip={c} onOpen={() => {}} admin onDelete={onDelete} onFeature={onFeature}/>)}</div></>}
          {section === "Uploads" && <><div className="page-title-row"><div><span className="eyebrow">MEDIA STORAGE</span><h1>Uploads</h1><p className="subheading">Video uploads will connect to your object-storage bucket.</p></div><button className="primary-button" onClick={onUpload}><UploadCloud size={16}/> New upload</button></div><div className="setup-card"><div className="setup-icon"><HardDrive size={25}/></div><h2>Connect video storage</h2><p>For ~200 MB clips, upload directly from the browser to object storage using a short-lived signed upload URL. Your hosting server never receives the entire video.</p><div className="setup-steps"><span><Check size={15}/> Create a storage bucket</span><span><Check size={15}/> Configure private upload permissions</span><span><Check size={15}/> Save video metadata in the database</span></div><span className="coming-soon">INTEGRATION NOT CONFIGURED</span></div></>}
          {section === "Settings" && <><div className="page-title-row"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="subheading">Your site configuration.</p></div></div><div className="settings-card"><div><strong>Site name</strong><p>Shown in the header and browser tab.</p></div><span>Clutch Archive</span></div><div className="settings-card"><div><strong>Admin access</strong><p>Authentication must be configured before deployment.</p></div><span className="warning-pill">Not configured</span></div><div className="settings-card"><div><strong>Video storage</strong><p>Separate object storage for large video files.</p></div><span className="warning-pill">Not connected</span></div></>}
        </div>
      </main>
    </div>
  );
}

function AdminAccess({ onBack, children }) {
  const [session, setSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setSessionLoaded(true);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError("");
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(`Could not load your sign-in session: ${sessionError.message}`);
      setSession(data.session);
      setSessionLoaded(true);
    }).catch((sessionError) => {
      if (!active) return;
      setError(`Could not load your sign-in session: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
      setSessionLoaded(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(false);
      setAccessChecked(true);
      return;
    }

    let active = true;
    setAccessChecked(false);
    setAccessError("");
    supabase.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data, error: accessError }) => {
        if (!active) return;
        if (accessError) {
          setAccessError(accessError.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
        setAccessChecked(true);
      })
      .catch((accessError) => {
        if (!active) return;
        setAccessError(accessError instanceof Error ? accessError.message : String(accessError));
        setIsAdmin(false);
        setAccessChecked(true);
      });

    return () => { active = false; };
  }, [session]);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(`Sign-in failed: ${signInError instanceof Error ? signInError.message : String(signInError)}`);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(`Could not sign out: ${signOutError.message}`);
    } catch (signOutError) {
      setError(`Could not sign out: ${signOutError instanceof Error ? signOutError.message : String(signOutError)}`);
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <AdminAccessMessage onBack={onBack} title="Admin access is not configured">
        Add the Supabase project URL and public anon key to your local environment, then set up the owner allowlist.
      </AdminAccessMessage>
    );
  }

  if (!sessionLoaded || (session && !accessChecked)) {
    return <AdminAccessMessage onBack={onBack} title="Checking admin access">Please wait while your account is verified.</AdminAccessMessage>;
  }

  if (session && accessError) {
    return (
      <AdminAccessMessage onBack={onBack} title="Could not verify owner access">
        The owner allowlist check failed: {accessError}. Confirm that the Supabase setup SQL ran successfully in this project, then retry.
      </AdminAccessMessage>
    );
  }

  if (session && isAdmin) return children(signOut, error);

  if (session && !isAdmin) {
    return (
      <AdminAccessMessage onBack={onBack} title="This account is not authorized" action={signOut} actionLabel="Sign out">
        This Supabase account is not on the owner allowlist.
        {error && <span className="auth-error">{error}</span>}
      </AdminAccessMessage>
    );
  }

  return (
    <main className="admin-access">
      <div className="admin-access-card">
        <span className="setup-icon"><ShieldCheck size={25}/></span>
        <span className="eyebrow">OWNER AREA</span>
        <h1>Owner sign in</h1>
        <p>Sign in with the Supabase account that was added to the owner allowlist.</p>
        <form className="auth-form" onSubmit={signIn}>
          <div className="field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onBack}>Back to highlights</button><button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button></div>
        </form>
      </div>
    </main>
  );
}

function AdminAccessMessage({ onBack, title, children, action, actionLabel }) {
  return (
    <main className="admin-access">
      <div className="admin-access-card">
        <span className="setup-icon"><ShieldCheck size={25}/></span>
        <span className="eyebrow">OWNER AREA</span>
        <h1>{title}</h1>
        <p>{children}</p>
        <div className="modal-actions">
          {action && <button className="secondary-button" onClick={action}>{actionLabel}</button>}
          <button className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Back to highlights</button>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [clips, setClips] = useState(initialClips);
  const [admin, setAdmin] = useState(window.location.hash === "#admin");
  const [search, setSearch] = useState("");
  const [mapFilter, setMapFilter] = useState("All maps");
  const [tagFilter, setTagFilter] = useState("All types");
  const [modalClip, setModalClip] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sort, setSort] = useState("Newest first");
  useEffect(() => {
    const syncAdminRoute = () => setAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", syncAdminRoute);
    return () => window.removeEventListener("hashchange", syncAdminRoute);
  }, []);
  const filtered = useMemo(() => clips.filter(c =>
    (mapFilter === "All maps" || c.map === mapFilter) &&
    (tagFilter === "All types" || c.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))) &&
    `${c.title} ${c.map} ${c.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => sort === "Newest first" ? b.id-a.id : a.id-b.id), [clips, mapFilter, tagFilter, search, sort]);

  const goHome = () => { setAdmin(false); window.location.hash = ""; window.scrollTo(0,0); };
  const addClip = (clip) => setClips(prev => [{ ...clip, id: Math.max(0, ...prev.map(c => c.id)) + 1 }, ...prev]);
  const deleteClip = (id) => setClips(prev => prev.filter(c => c.id !== id));
  const featureClip = (id) => setClips(prev => prev.map(c => c.id === id ? { ...c, featured: !c.featured } : c));

  if (admin) return <AdminAccess onBack={goHome}>{(onSignOut, authError) => <AdminView clips={clips} onBack={goHome} onSignOut={onSignOut} authError={authError} onUpload={() => setUploadOpen(true)} onDelete={deleteClip} onFeature={featureClip}/>}</AdminAccess>;

  return (
    <div className="site-shell">
      <header className="site-header">
        <button className="brand brand-button" onClick={goHome}><span className="brand-mark"><Crosshair size={19}/></span><span>CLUTCH<span className="brand-muted">ARCHIVE</span></span></button>
        <nav className="main-nav"><a className="nav-active" href="#highlights">Highlights</a><a href="#about">About</a></nav>
        <div className="header-actions"><span className="status-dot"/> <span className="online-label">PERSONAL FRAG MOVIE</span></div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-grid"/>
          <div className="hero-content"><div className="hero-kicker"><span/> PERSONAL CS2 LIBRARY</div><h1>Every round has<br/>a <em>story.</em></h1><p>A collection of clutches, clean entries, and rounds worth remembering.</p><div className="hero-actions"><a className="primary-button" href="#highlights"><Clapperboard size={16}/> Explore highlights</a></div></div>
          <div className="hero-aside"><div className="crosshair-large"><Crosshair size={92} strokeWidth={0.8}/></div><span className="aside-line"/> <span className="aside-caption">RECORDED MOMENTS / 001—∞</span></div>
          <div className="hero-bottom"><span><Activity size={14}/> CLIP ARCHIVE</span><span>COUNTER-STRIKE 2 <b>●</b> PERSONAL COLLECTION</span><span>EST. 2026</span></div>
        </section>
        <section className="highlights-section" id="highlights">
          <div className="section-top"><div><span className="eyebrow">THE COLLECTION</span><h2>Latest highlights <span className="count-badge">{clips.length.toString().padStart(2,"0")}</span></h2><p className="section-description">The rounds that deserve a replay.</p></div></div>
          <div className="filters">
            <div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search highlights..." /></div>
            <div className="filter-control"><Filter size={15}/><select value={mapFilter} onChange={e => setMapFilter(e.target.value)} aria-label="Filter by map">{maps.map(m => <option key={m}>{m}</option>)}</select><ChevronDown size={14}/></div>
            <div className="filter-control"><Grid2X2 size={15}/><select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="Filter by highlight type">{["All types", "3K", "4K", "Ace", "clutch", "Retake", "Entry"].map(m => <option key={m}>{m}</option>)}</select><ChevronDown size={14}/></div>
            <div className="sort-control"><span>Sort</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option></select></div>
          </div>
          <div className="clip-grid">{filtered.map(c => <ClipCard key={c.id} clip={c} onOpen={setModalClip} onFeature={featureClip}/>)}</div>
          {filtered.length === 0 && <div className="empty-state"><Search size={28}/><h3>No highlights found</h3><p>Try a different search or filter.</p><button className="secondary-button" onClick={() => {setSearch("");setMapFilter("All maps");setTagFilter("All types");}}>Clear filters</button></div>}
          <div className="load-more"><span/> <span>YOU'VE REACHED THE END FOR NOW</span> <span/></div>
        </section>
      </main>
      <footer id="about"><button className="brand brand-button" onClick={goHome}><span className="brand-mark"><Crosshair size={17}/></span><span>CLUTCH<span className="brand-muted">ARCHIVE</span></span></button><span>MADE FOR THE LOVE OF THE GAME.</span></footer>
      {modalClip && <Modal clip={modalClip} onClose={() => setModalClip(null)}/>}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onAdd={addClip}/>}
    </div>
  );
}

export default App;
