import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { isSupabaseConfigured, supabase, supabasePublishableKey, supabaseUrl, toClip } from "./lib/supabase.js";
import {
  Activity, ArrowLeft, Check, ChevronDown, CircleUserRound, Clapperboard, Code2, ExternalLink,
  Crosshair, Database, Eye, Film, Filter, Gamepad2, Grid2X2, HardDrive, Heart, MapPin,
  LayoutDashboard, LogOut, Pencil, Plus, Search, Settings, ShieldCheck, Star,
  Trash2, UploadCloud, Video, X
} from "lucide-react";

const maps = ["All maps", "Mirage", "Cache", "Nuke", "Ancient", "Inferno", "Dust II", "Anubis", "Vertigo"];
const mapIconPaths = {
  Ancient: "/maps/ancient.svg",
  Anubis: "/maps/anubis.svg",
  Cache: "/maps/cache.svg",
  "Dust II": "/maps/dust2.svg",
  Inferno: "/maps/inferno.svg",
  Mirage: "/maps/mirage.svg",
  Nuke: "/maps/nuke.svg",
  Vertigo: "/maps/vertigo.svg",
};
const inventoryItems = [
  { category: "KNIFE", name: "StatTrak™ Nomad Knife | Tiger Tooth", wear: "Factory New", price: "$206.79", image: "/inventory-knife.png" },
  { category: "GLOVES", name: "Specialist Gloves | Lt. Commander", wear: "Minimal Wear", price: "$228.63", image: "/inventory-gloves.png" },
  { category: "PISTOL", name: "USP-S | Jawbreaker", wear: "Factory New", price: "$9.14", image: "/inventory-usp-s-jawbreaker.png" },
  { category: "PISTOL", name: "Desert Eagle | Trigger Discipline", wear: "Factory New", price: "$17.21", image: "/inventory-desert-eagle-trigger-discipline.png" },
  { category: "RIFLE", name: "M4A1-S | Black Lotus", wear: "Factory New", price: "$10.53", image: "/inventory-m4a1-s-black-lotus.png" },
  { category: "SNIPER RIFLE", name: "AWP | Exothermic", wear: "Minimal Wear", price: "$8.30", image: "/inventory-awp-exothermic.png" },
];
const inventoryTotalCents = inventoryItems.reduce(
  (total, item) => total + Math.round(Number(item.price.replace("$", "")) * 100),
  0,
);
const MAX_VIDEO_SIZE_BYTES = 50_000_000;
const MAX_VIDEO_SIZE_LABEL = "50 MB";
const VIDEO_SIZE_ERROR = `Supabase's current Free plan limit is 50 MB per file. Compress the video or upgrade the Supabase plan to upload larger files.`;
const tagColorClasses = {
  "3k": "tag-blue",
  "4k": "tag-purple",
  ace: "tag-orange",
  "1v2 clutch": "tag-cyan",
  "1v3 clutch": "tag-teal",
  clutch: "tag-pink",
  entry: "tag-green",
  retake: "tag-yellow",
};

function videoSizeError(file) {
  if (file.size <= MAX_VIDEO_SIZE_BYTES) return "";
  return `This video is larger than ${MAX_VIDEO_SIZE_LABEL}. ${VIDEO_SIZE_ERROR}`;
}

function getTagColorClass(tag) {
  return tagColorClasses[tag.toLowerCase()] ?? "";
}

function MapIcon({ map }) {
  const iconPath = mapIconPaths[map];
  return iconPath ? <img className="map-icon" src={iconPath} alt="" aria-hidden="true"/> : null;
}

function MapName({ map, className = "map-name" }) {
  return <span className={className}><MapIcon map={map}/>{map}</span>;
}

function FilterDropdown({ label, value, options, onChange, withMapIcons = false }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)));
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(Math.max(0, options.indexOf(value)));
        setOpen(true);
      } else {
        setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
      }
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  };

  return (
    <div className="filter-dropdown" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        className="dropdown-trigger"
        type="button"
        role="combobox"
        aria-label={label}
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setActiveIndex(Math.max(0, options.indexOf(value)));
          setOpen((isOpen) => !isOpen);
        }}
      >
        <span>{withMapIcons ? <MapName map={value} className="map-dropdown-label"/> : value}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="dropdown-menu" id={id} role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <button
              key={option}
              ref={(element) => { optionRefs.current[index] = element; }}
              className={`dropdown-option ${option === value ? "selected" : ""}`}
              type="button"
              role="option"
              aria-selected={option === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              {withMapIcons ? <MapName map={option} className="map-dropdown-label"/> : option}
              {option === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClipCard({ clip, onOpen, onLike, admin, onDelete, onFeature, onEdit }) {
  return (
    <article className="clip-card">
      <button className="video-preview" onClick={() => onOpen(clip)} aria-label={`Open ${clip.title}`}>
        <div className="preview-top">
          <span className="quality-pill">2D</span>
          {admin && <span className="star-button" onClick={(e) => { e.stopPropagation(); onFeature?.(clip.id); }} title="Feature clip">
            <Star size={15} fill={clip.featured ? "currentColor" : "none"} />
          </span>}
        </div>
        {clip.videoUrl
          ? <video className="clip-video-preview" src={clip.videoUrl} preload="metadata" muted playsInline />
          : <div className="preview-center"><span className="play-circle"><span /></span><span className="preview-hint">VIDEO PREVIEW</span></div>}
        {admin && <span className="delete-button" onClick={(e) => { e.stopPropagation(); onDelete(clip.id); }} title="Delete clip"><Trash2 size={15}/></span>}
        {admin && <span className="edit-button" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onEdit(clip); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onEdit(clip); } }} title="Edit highlight" aria-label={`Edit ${clip.title}`}><Pencil size={15}/></span>}
        <span className="play-overlay"><span className="play-triangle">▶</span></span>
      </button>
      <div className="clip-info">
        <div className="clip-title-line">
          <h3>{clip.title}</h3>
        </div>
        <div className="clip-engagement-row">
          <div className="tags">
            {clip.tags.map((tag) => <span key={tag} className={`tag ${getTagColorClass(tag)}`}>{tag.toLowerCase().includes("clutch") && "● "}{tag}</span>)}
          </div>
          <button className={`like-button ${clip.liked ? "liked" : ""}`} onClick={() => onLike(clip.id)} disabled={clip.likePending} aria-label={`${clip.liked ? "Unlike" : "Like"} ${clip.title}; ${clip.likeCount ?? 0} likes`} aria-pressed={Boolean(clip.liked)}>
            <Heart size={15} fill={clip.liked ? "currentColor" : "none"}/><span>{clip.likeCount ?? 0}</span>
          </button>
        </div>
        <div className="clip-divider" />
        <div className="clip-meta">
          <MapName map={clip.map}/>
          <span className="clip-date">{clip.date}</span>
        </div>
      </div>
    </article>
  );
}

function TrailerCard() {
  return (
    <div className="hero-trailer-card">
      <div className="hero-trailer-screen">
        <video
          className="hero-trailer-video"
          src="/cs2-release-trailer.mp4"
          autoPlay
          controls
          muted
          playsInline
          preload="metadata"
          aria-label="Counter-Strike 2 release trailer"
        />
      </div>
      <div className="hero-trailer-caption">
        <span className="eyebrow">COUNTER-STRIKE 2</span>
        <strong>Release trailer</strong>
      </div>
    </div>
  );
}

function Modal({ clip, onClose, onLike }) {
  if (!clip) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-video">{clip.videoUrl
          ? <video src={clip.videoUrl} controls autoPlay playsInline />
          : <><Video size={42}/><p>No video file is attached</p><small>This is a demo highlight.</small></>}</div>
        <div className="modal-content">
          <div><MapName map={clip.map} className="eyebrow modal-map-name"/><h2>{clip.title}</h2></div>
        </div>
        <div className="modal-engagement-row">
          <div className="tags">{clip.tags.map(t => <span key={t} className={`tag ${getTagColorClass(t)}`}>{t}</span>)}</div>
          <button className={`like-button modal-like-button ${clip.liked ? "liked" : ""}`} onClick={() => onLike(clip.id)} disabled={clip.likePending} aria-pressed={Boolean(clip.liked)}>
            <Heart size={16} fill={clip.liked ? "currentColor" : "none"}/><span>{clip.likeCount ?? 0} likes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HighlightFormModal({ clip, onClose, onSave }) {
  const [title, setTitle] = useState(clip?.title ?? "");
  const [map, setMap] = useState(clip?.map ?? "Mirage");
  const [tags, setTags] = useState(() => clip?.tags?.length ? clip.tags : ["3K"]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title for this highlight.");
    if (tags.length === 0) return setError("Choose at least one highlight type.");
    if (!clip && !file) return setError("Choose a video file to upload.");
    if (file && videoSizeError(file)) return setError(videoSizeError(file));
    setBusy(true);
    setError("");
    try {
      await onSave({ title: title.trim(), map, tags, file, onProgress: setProgress });
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={() => { if (!busy) onClose(); }}>
      <div className="upload-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="eyebrow">CONTENT LIBRARY</span><h2>{clip ? "Edit highlight" : "New highlight"}</h2></div><button className="icon-button" disabled={busy} onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit}>
          <label className="drop-zone">
            <UploadCloud size={27}/>
            <strong>{file ? file.name : clip?.videoPath ? "Keep current video or choose a replacement" : "Choose a video file"}</strong>
            <span>{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ready to upload` : "MP4, WebM or MOV · max 50 MB per file on the current Supabase plan"}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e => { const selectedFile = e.target.files?.[0] || null; setFile(selectedFile); setError(selectedFile ? videoSizeError(selectedFile) : ""); }} />
          </label>
          <div className="field"><label htmlFor="title">Highlight title</label><input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 1v3 clutch on Mirage" /></div>
          <div className="field"><label>Map</label><div className="filter-control form-map-filter"><Filter size={15}/><FilterDropdown label="Map" value={map} options={maps.slice(1)} onChange={setMap} withMapIcons/></div></div>
          <fieldset className="field tag-picker"><legend>Highlight types</legend><div className="tag-picker-options">{["3K", "4K", "Ace", "1v2 clutch", "1v3 clutch", "Clutch", "Entry", "Retake"].map(type => <label key={type} className={`tag-choice ${tags.includes(type) ? "selected" : ""}`}><input type="checkbox" checked={tags.includes(type)} disabled={busy} onChange={() => setTags(current => current.includes(type) ? current.filter(item => item !== type) : [...current, type])}/><span>{type}</span></label>)}</div></fieldset>
          {busy && <div className="upload-progress"><span>Uploading video… {progress}%</span><progress max="100" value={progress}/></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="demo-warning"><ShieldCheck size={16}/><span>{clip ? "Saving changes keeps this highlight’s likes." : "Video and highlight details will be saved in Supabase and published to the public gallery."}</span></div>
          <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={busy || !isSupabaseConfigured}>{busy ? `${file ? `Uploading ${progress}%` : "Saving..."}` : clip ? "Save changes" : <><Plus size={16}/> Upload highlight</>}</button></div>
        </form>
      </div>
    </div>
  );
}

function AdminView({ clips, loading, dataError, onBack, onSignOut, onAuthorized, onUpload, onEdit, onDelete, onFeature, onLike }) {
  const [section, setSection] = useState("Overview");
  useEffect(() => { void onAuthorized(); }, []);
  const nav = [
    { name: "Overview", icon: LayoutDashboard }, { name: "Highlights", icon: Clapperboard },
    { name: "Uploads", icon: UploadCloud }, { name: "Settings", icon: Settings }
  ];
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={onBack}><span className="brand-mark"><Crosshair size={19}/></span><span>THE<span className="brand-muted">FEAR14</span></span></button>
        <div className="sidebar-label">WORKSPACE</div>
        {nav.map(item => <button key={item.name} className={`nav-item ${section === item.name ? "active" : ""}`} onClick={() => setSection(item.name)}><item.icon size={17}/>{item.name}{item.name === "Highlights" && <span className="nav-count">{clips.length}</span>}</button>)}
        <div className="sidebar-bottom"><div className="admin-avatar"><CircleUserRound size={20}/></div><div className="admin-user"><strong>Administrator</strong><span>Owner workspace</span></div><button className="icon-button" onClick={onSignOut} title="Sign out"><LogOut size={16}/></button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>{section}</strong></div><div className="admin-top-actions"><span className="private-badge"><ShieldCheck size={13}/> PRIVATE PREVIEW</span><button className="site-link" onClick={onBack}><Eye size={15}/> View website</button></div></header>
        <div className="admin-page">
          {dataError && <p className="auth-error" role="alert">{dataError}</p>}
          {section === "Overview" && <>
            <div className="page-title-row"><div><span className="eyebrow">YOUR PERSONAL LIBRARY</span><h1>Dashboard</h1><p className="subheading">Your CS2 moments, organized in one place.</p></div><button className="primary-button" onClick={onUpload}><Plus size={16}/> Add highlight</button></div>
            <div className="stat-grid"><div className="stat-card"><span className="stat-icon"><Film size={18}/></span><span className="stat-label">TOTAL HIGHLIGHTS</span><strong>{loading ? "…" : clips.length}</strong><small>In your library</small></div><div className="stat-card"><span className="stat-icon"><Star size={18}/></span><span className="stat-label">FEATURED CLIPS</span><strong>{clips.filter(c => c.featured).length}</strong><small>Shown as favorites</small></div><div className="stat-card"><span className="stat-icon"><Database size={18}/></span><span className="stat-label">STORAGE STATUS</span><strong>Connected</strong><small>Supabase Storage</small></div></div>
            <div className="section-heading"><div><h2>Recent highlights</h2><p>Manage your latest clips</p></div><button className="text-button" onClick={() => setSection("Highlights")}>View all <ArrowLeft className="arrow-right" size={14}/></button></div>
            {loading ? <p className="subheading">Loading highlights…</p> : <div className="admin-list">{clips.slice(0, 5).map(c => <div className="admin-list-row" key={c.id}><div className="mini-video"><Video size={17}/></div><div className="list-title"><strong>{c.title}</strong><span>{c.map}</span></div><span className="draft-pill">{c.is_published ? "Published" : "Draft"}</span><button className="icon-button" onClick={() => onEdit(c)} title={`Edit ${c.title}`}><Pencil size={15}/></button><button className="icon-button danger-quiet" onClick={() => onDelete(c.id)} title="Delete highlight"><Trash2 size={15}/></button></div>)}</div>}
          </>}
          {section === "Highlights" && <><div className="page-title-row"><div><span className="eyebrow">CONTENT LIBRARY</span><h1>Highlights</h1><p className="subheading">Edit, feature or remove clips.</p></div><button className="primary-button" onClick={onUpload}><Plus size={16}/> Add highlight</button></div>{loading ? <p className="subheading">Loading highlights…</p> : <div className="admin-grid">{clips.map(c => <ClipCard key={c.id} clip={c} onOpen={() => {}} onLike={onLike} admin onDelete={onDelete} onEdit={onEdit} onFeature={onFeature}/>)}</div>}</>}
          {section === "Uploads" && <><div className="page-title-row"><div><span className="eyebrow">MEDIA STORAGE</span><h1>Uploads</h1><p className="subheading">Videos upload directly to your Supabase Storage bucket.</p></div><button className="primary-button" onClick={onUpload}><UploadCloud size={16}/> New upload</button></div><div className="setup-card"><div className="setup-icon"><HardDrive size={25}/></div><h2>Supabase Storage connected</h2><p>Videos are uploaded directly to your highlights bucket using resumable transfers. The bucket’s configured file-size limit and your Supabase plan apply.</p><div className="setup-steps"><span><Check size={15}/> Owner-only upload policies enabled</span><span><Check size={15}/> Video metadata saved in highlights</span><span><Check size={15}/> Published clips appear in the public gallery</span></div><span className="coming-soon">SUPABASE STORAGE</span></div></>}
          {section === "Settings" && <><div className="page-title-row"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="subheading">Your site configuration.</p></div></div><div className="settings-card"><div><strong>Site name</strong><p>Shown in the header and browser tab.</p></div><span>thefear14</span></div><div className="settings-card"><div><strong>Admin access</strong><p>Supabase Auth and owner allowlist.</p></div><span>Connected</span></div><div className="settings-card"><div><strong>Video storage</strong><p>Owner-restricted uploads with public playback for published clips.</p></div><span>Supabase Storage</span></div></>}
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

function uploadVideo(file, objectPath, accessToken, onProgress) {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      headers: {
        apikey: supabasePublishableKey,
        authorization: `Bearer ${accessToken}`,
      },
      metadata: {
        bucketName: "highlights",
        objectName: objectPath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      onProgress(bytesUploaded, bytesTotal) {
        onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onError(error) {
        if (/413|maximum size exceeded/i.test(error.message)) {
          reject(new Error(VIDEO_SIZE_ERROR));
          return;
        }
        reject(new Error(`Video upload failed: ${error.message}`));
      },
      onSuccess() {
        resolve();
      },
    });

    upload.start();
  });
}

function App() {
  const [clips, setClips] = useState([]);
  const [dataLoading, setDataLoading] = useState(isSupabaseConfigured);
  const [dataError, setDataError] = useState("");
  const [route, setRoute] = useState(
    window.location.hash === "#admin" ? "admin" :
      window.location.hash === "#about" ? "about" : "highlights"
  );
  const [search, setSearch] = useState("");
  const [mapFilter, setMapFilter] = useState("All maps");
  const [tagFilter, setTagFilter] = useState("All types");
  const [modalClip, setModalClip] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingClip, setEditingClip] = useState(null);
  const [sort, setSort] = useState("Newest first");
  const loadRequest = useRef(0);
  const [visitorId, setVisitorId] = useState(null);

  const loadClips = useCallback(async (includeUnpublished = false) => {
    if (!supabase) return;
    const requestId = ++loadRequest.current;
    setDataLoading(true);
    setDataError("");
    try {
      let query = supabase.from("highlights").select("*").order("created_at", { ascending: false });
      if (!includeUnpublished) query = query.eq("is_published", true);
      const { data, error } = await query;
      if (error) throw error;
      if (requestId !== loadRequest.current) return;
      const loadedClips = data.map(toClip);
      if (visitorId) {
        const { data: stats, error: statsError } = await supabase.rpc("get_highlight_like_stats", { p_visitor_id: visitorId });
        if (statsError) throw statsError;
        const statsById = new Map(stats.map((item) => [item.highlight_id, item]));
        for (const clip of loadedClips) {
          const statsForClip = statsById.get(clip.id);
          clip.likeCount = Number(statsForClip?.like_count ?? 0);
          clip.liked = Boolean(statsForClip?.liked);
        }
      }
      if (requestId !== loadRequest.current) return;
      setClips(loadedClips);
    } catch (loadError) {
      if (requestId !== loadRequest.current) return;
      setDataError(`Could not load highlights: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
    } finally {
      if (requestId === loadRequest.current) setDataLoading(false);
    }
  }, [visitorId]);
  const loadAdminClips = useCallback(() => loadClips(true), [loadClips]);

  useEffect(() => {
    try {
      const storageKey = "clutch-archive-visitor-id";
      const existingId = window.localStorage.getItem(storageKey);
      const id = existingId || crypto.randomUUID();
      if (!existingId) window.localStorage.setItem(storageKey, id);
      setVisitorId(id);
    } catch (error) {
      setDataError(`Likes require browser storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  useEffect(() => {
    const syncAdminRoute = () => {
      const nextRoute = window.location.hash === "#admin" ? "admin" :
        window.location.hash === "#about" ? "about" : "highlights";
      setRoute(nextRoute);
      void loadClips(false);
    };
    window.addEventListener("hashchange", syncAdminRoute);
    if (!window.location.hash) window.history.replaceState(null, "", "#highlights");
    void loadClips(false);
    return () => {
      window.removeEventListener("hashchange", syncAdminRoute);
    };
  }, [loadClips]);
  const filtered = useMemo(() => clips.filter(c =>
    (mapFilter === "All maps" || c.map === mapFilter) &&
    (tagFilter === "All types" || c.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))) &&
    `${c.title} ${c.map} ${c.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => {
    const order = new Date(b.createdAt ?? b.id).getTime() - new Date(a.createdAt ?? a.id).getTime();
    return sort === "Newest first" ? order : -order;
  }), [clips, mapFilter, tagFilter, search, sort]);

  const goHome = () => {
    setClips((previous) => previous.filter((clip) => clip.is_published));
    setRoute("highlights");
    window.location.hash = "highlights";
    window.scrollTo(0,0);
  };
  const addClip = async ({ file, onProgress, ...metadata }) => {
    if (!supabase) throw new Error("Supabase is not configured. Add the project URL and publishable key.");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Could not verify your upload session: ${sessionError.message}`);
    if (!session) throw new Error("Your session expired. Sign in again before uploading.");

    const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
    const objectPath = `${crypto.randomUUID()}-${safeName || "highlight-video"}`;
    await uploadVideo(file, objectPath, session.access_token, onProgress);

    const { data, error } = await supabase.from("highlights").insert({
      title: metadata.title,
      map: metadata.map,
      tags: metadata.tags,
      video_path: objectPath,
      is_published: true,
    }).select("*").single();

    if (error) {
      const { error: cleanupError } = await supabase.storage.from("highlights").remove([objectPath]);
      if (cleanupError) {
        throw new Error(`Highlight details could not be saved: ${error.message}. The uploaded video could not be cleaned up: ${cleanupError.message}`);
      }
      throw new Error(`Highlight details could not be saved: ${error.message}`);
    }

    const clip = toClip(data);
    setClips((previous) => [clip, ...previous]);
  };

  const updateClip = async ({ file, onProgress, ...metadata }) => {
    if (!supabase || !editingClip) throw new Error("The highlight could not be updated.");
    let replacementPath;

    if (file) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Could not verify your upload session: ${sessionError.message}`);
      if (!session) throw new Error("Your session expired. Sign in again before replacing the video.");
      const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
      replacementPath = `${crypto.randomUUID()}-${safeName || "highlight-video"}`;
      await uploadVideo(file, replacementPath, session.access_token, onProgress);
    }

    const changes = {
      title: metadata.title,
      map: metadata.map,
      tags: metadata.tags,
      ...(replacementPath ? { video_path: replacementPath } : {}),
    };
    const { data, error } = await supabase.from("highlights")
      .update(changes)
      .eq("id", editingClip.id)
      .select("*")
      .single();

    if (error) {
      if (replacementPath) {
        const { error: cleanupError } = await supabase.storage.from("highlights").remove([replacementPath]);
        if (cleanupError) {
          throw new Error(`Highlight could not be updated: ${error.message}. The replacement video could not be cleaned up: ${cleanupError.message}`);
        }
      }
      throw new Error(`Highlight could not be updated: ${error.message}`);
    }

    const updatedClip = toClip(data);
    setClips((previous) => previous.map((clip) => clip.id === updatedClip.id ? { ...clip, ...updatedClip } : clip));
    setEditingClip(null);

    if (replacementPath && editingClip.videoPath) {
      const { error: cleanupError } = await supabase.storage.from("highlights").remove([editingClip.videoPath]);
      if (cleanupError) {
        setDataError(`Highlight updated, but its previous video could not be removed from storage: ${cleanupError.message}`);
      }
    }
  };

  const deleteClip = async (id) => {
    if (!supabase) return;
    const clip = clips.find((item) => item.id === id);
    const { error } = await supabase.from("highlights").delete().eq("id", id);
    if (error) throw new Error(`Could not delete highlight: ${error.message}`);
    setClips((previous) => previous.filter((item) => item.id !== id));
    if (clip?.videoPath) {
      const { error: storageError } = await supabase.storage.from("highlights").remove([clip.videoPath]);
      if (storageError) {
        setDataError(`Highlight deleted, but its video file could not be removed from storage: ${storageError.message}`);
      }
    }
  };

  const featureClip = async (id) => {
    if (!supabase) return;
    const clip = clips.find((item) => item.id === id);
    if (!clip) return;
    const { data, error } = await supabase.from("highlights").update({ featured: !clip.featured }).eq("id", id).select("*").single();
    if (error) {
      setDataError(`Could not update featured status: ${error.message}`);
      return;
    }
    const updated = toClip(data);
    setClips((previous) => previous.map((item) => item.id === id ? updated : item));
  };
  const toggleLike = async (id) => {
    if (!supabase || !visitorId) {
      setDataError("Likes are unavailable because browser storage or Supabase is not configured.");
      return;
    }
    setClips((previous) => previous.map((clip) => clip.id === id ? { ...clip, likePending: true } : clip));
    try {
      const { data, error } = await supabase.rpc("toggle_highlight_like", {
        p_highlight_id: id,
        p_visitor_id: visitorId,
      });
      if (error) throw error;
      setClips((previous) => previous.map((clip) => clip.id === id ? {
        ...clip,
        likeCount: Number(data[0].like_count),
        liked: data[0].liked,
        likePending: false,
      } : clip));
      setDataError("");
    } catch (likeError) {
      setClips((previous) => previous.map((clip) => clip.id === id ? { ...clip, likePending: false } : clip));
      setDataError(`Could not update like: ${likeError instanceof Error ? likeError.message : String(likeError)}`);
    }
  };

  if (route === "admin") return <AdminAccess onBack={goHome}>{(onSignOut) => <><AdminView clips={clips} loading={dataLoading} dataError={dataError} onBack={goHome} onSignOut={onSignOut} onAuthorized={loadAdminClips} onUpload={() => setUploadOpen(true)} onEdit={setEditingClip} onDelete={(id) => { void deleteClip(id).catch((error) => setDataError(error.message)); }} onFeature={featureClip} onLike={toggleLike}/>{uploadOpen && <HighlightFormModal onClose={() => setUploadOpen(false)} onSave={addClip} />}{editingClip && <HighlightFormModal clip={editingClip} onClose={() => setEditingClip(null)} onSave={updateClip} />}</>}</AdminAccess>;

  return (
    <div className="site-shell">
      <header className="site-header">
        <button className="brand brand-button" onClick={goHome}><span className="brand-mark"><Crosshair size={19}/></span><span>THE<span className="brand-muted">FEAR14</span></span></button>
        <nav className="main-nav"><a className={route === "highlights" ? "nav-active" : ""} href="#highlights">Highlights</a><a className={route === "about" ? "nav-active" : ""} href="#about">About</a></nav>
        <div className="header-actions"><span className="status-dot"/> <span className="online-label">PERSONAL FRAG MOVIE</span></div>
      </header>
      {route === "highlights" ? (
        <main>
          <section className="hero">
            <div className="hero-grid"/>
            <div className="hero-content">
              <div className="hero-kicker"><span/> PERSONAL CS2 LIBRARY</div>
              <h1>Every round has<br/>a <em>story.</em></h1>
              <p>A collection of clutches, clean entries, and rounds worth remembering.</p>
              <div className="hero-actions"><a className="primary-button" href="#collection"><Clapperboard size={16}/> Explore highlights</a></div>
            </div>
            <div className="hero-aside">
              <TrailerCard/>
            </div>
            <div className="hero-bottom"><span><Activity size={14}/> CLIP ARCHIVE</span><span>COUNTER-STRIKE 2 <b>●</b> PERSONAL COLLECTION</span><span>EST. 2026</span></div>
          </section>
          <section className="highlights-section" id="collection">
          <div className="section-top"><div><span className="eyebrow">THE COLLECTION</span><h2>Latest highlights <span className="count-badge">{clips.length.toString().padStart(2,"0")}</span></h2><p className="section-description">The rounds that deserve a replay.</p></div></div>
          {dataError && <p className="auth-error" role="alert">{dataError}</p>}
          {dataLoading && <p className="section-description" role="status">Loading highlights…</p>}
          <div className="filters">
            <div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search highlights..." /></div>
            <div className="filter-control"><Filter size={15}/><FilterDropdown label="Filter by map" value={mapFilter} options={maps} onChange={setMapFilter} withMapIcons/></div>
            <div className="filter-control"><Grid2X2 size={15}/><FilterDropdown label="Filter by highlight type" value={tagFilter} options={["All types", "3K", "4K", "Ace", "clutch", "Retake", "Entry"]} onChange={setTagFilter}/></div>
            <div className="sort-control"><span>Sort</span><FilterDropdown label="Sort highlights" value={sort} options={["Newest first", "Oldest first"]} onChange={setSort}/></div>
          </div>
          <div className="clip-grid">{filtered.map(c => <ClipCard key={c.id} clip={c} onOpen={setModalClip} onLike={toggleLike}/>)}</div>
          {!dataLoading && !dataError && filtered.length === 0 && <div className="empty-state"><Search size={28}/><h3>No highlights found</h3><p>Try a different search or filter.</p><button className="secondary-button" onClick={() => {setSearch("");setMapFilter("All maps");setTagFilter("All types");}}>Clear filters</button></div>}
          <div className="load-more"><span/> <span>YOU'VE REACHED THE END FOR NOW</span> <span/></div>
          </section>
        </main>
      ) : (
        <main className="about-page" id="about">
          <div className="about-layout">
            <section className="about-hero">
              <div className="about-intro">
                <span className="eyebrow">PLAYER PROFILE <span className="about-index">/ 01</span></span>
                <h1>Akbarali<br/><em>Nabiev.</em></h1>
                <p className="about-bio">EX - UI/UX designer and frontend developer based in Warsaw, Poland. I enjoy creating intuitive, polished web experiences—and when I’m away from the screen, I’m usually playing CS2. This is where I keep the rounds worth replaying.</p>
                <span className="about-location"><MapPin size={15}/> Warsaw, Poland</span>
              </div>
              <div className="about-visual" aria-hidden="true">
                <div className="about-visual-grid"/>
                <div className="about-scope"><Crosshair size={148} strokeWidth={0.65}/></div>
                <span className="about-visual-label">THE FEAR14 <b>·</b> ONLINE</span>
                <span className="about-visual-corner">CS2 / 2026</span>
              </div>
            </section>

            <section className="about-profiles" aria-label="Profiles">
              <article className="about-profile">
                <span className="about-profile-icon"><Code2 size={18}/></span>
                <span className="eyebrow">ON THE WEB</span>
                <h2>Design &amp; build</h2>
                <p>Interfaces, frontend, and projects I’ve been working on.</p>
                <div className="about-profile-links">
                  <a href="https://github.com/akbaralinabiev" target="_blank" rel="noopener noreferrer">GitHub profile <ExternalLink size={14}/></a>
                  <a href="https://akbaralinabiev.vercel.app/" target="_blank" rel="noopener noreferrer">Portfolio <ExternalLink size={14}/></a>
                </div>
              </article>
              <article className="about-profile">
                <span className="about-profile-icon"><Gamepad2 size={18}/></span>
                <span className="eyebrow">IN-GAME</span>
                <h2>Counter-Strike 2</h2>
                <p>Competitive matches, good teammates, and rounds worth replaying.</p>
                <div className="about-profile-links">
                  <a href="https://steamcommunity.com/id/austinphilips" target="_blank" rel="noopener noreferrer">Steam profile <ExternalLink size={14}/></a>
                  <a href="https://www.faceit.com/en/players/the_fear14" target="_blank" rel="noopener noreferrer">FACEIT profile <ExternalLink size={14}/></a>
                </div>
              </article>
            </section>

            <section className="about-inventory" aria-labelledby="about-inventory-title">
              <div className="about-inventory-heading">
                <div>
                  <span className="eyebrow">LOADOUT / MARKET SNAPSHOT</span>
                  <h2 id="about-inventory-title">Inventory</h2>
                </div>
                <div className="about-inventory-summary">
                  <p>Prices are static USD estimates, not live market data.</p>
                  <p className="about-inventory-total">Total value <strong>${(inventoryTotalCents / 100).toFixed(2)}</strong></p>
                </div>
              </div>
              <div className="about-inventory-grid">
                {inventoryItems.map((item) => (
                  <article className="about-item" key={item.name}>
                    <div className="about-item-image">
                      <img src={item.image} alt=""/>
                    </div>
                    <div className="about-item-details">
                      <span className="about-item-category">{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.wear}</p>
                    </div>
                    <div className="about-item-price">
                      <span>EST. VALUE</span>
                      <strong>{item.price}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}
      {modalClip && <Modal clip={clips.find((clip) => clip.id === modalClip.id) ?? modalClip} onClose={() => setModalClip(null)} onLike={toggleLike}/>}
    </div>
  );
}

export default App;
