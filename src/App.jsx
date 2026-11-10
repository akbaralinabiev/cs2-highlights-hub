import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { isSupabaseConfigured, supabase, supabasePublishableKey, supabaseUrl, toClip } from "./lib/supabase.js";
import {
  Activity, ArrowLeft, Check, ChevronDown, CircleUserRound, Clapperboard,
  Crosshair, Database, Eye, Film, Filter, Gamepad2, Grid2X2, HardDrive, Heart,
  LayoutDashboard, LogOut, Pencil, Plus, Search, Settings, ShieldCheck, Star,
  Trash2, UploadCloud, Video, X
} from "lucide-react";

const maps = ["All maps", "Mirage", "Cache", "Nuke", "Ancient", "Inferno", "Dust II", "Anubis"];

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
        <div className="tags">
          {clip.tags.map((tag) => <span key={tag} className={`tag ${tag.toLowerCase().includes("clutch") ? "tag-cyan" : tag === "Ace" ? "tag-orange" : ""}`}>{tag.includes("clutch") && "● "}{tag}</span>)}
        </div>
        <button className={`like-button ${clip.liked ? "liked" : ""}`} onClick={() => onLike(clip.id)} disabled={clip.likePending} aria-label={`${clip.liked ? "Unlike" : "Like"} ${clip.title}; ${clip.likeCount ?? 0} likes`} aria-pressed={Boolean(clip.liked)}>
          <Heart size={15} fill={clip.liked ? "currentColor" : "none"}/><span>{clip.likeCount ?? 0}</span>
        </button>
        <div className="clip-divider" />
        <div className="clip-meta">
          <span className="map-name"><span className="map-emblem">✦</span>{clip.map}</span>
          <span className="clip-date">{clip.date}</span>
        </div>
      </div>
    </article>
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
          <div><span className="eyebrow">{clip.map}</span><h2>{clip.title}</h2></div>
        </div>
        <div className="tags">{clip.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
        <button className={`like-button modal-like-button ${clip.liked ? "liked" : ""}`} onClick={() => onLike(clip.id)} disabled={clip.likePending} aria-pressed={Boolean(clip.liked)}>
          <Heart size={16} fill={clip.liked ? "currentColor" : "none"}/><span>{clip.likeCount ?? 0} likes</span>
        </button>
      </div>
    </div>
  );
}

function HighlightFormModal({ clip, onClose, onSave }) {
  const [title, setTitle] = useState(clip?.title ?? "");
  const [map, setMap] = useState(clip?.map ?? "Mirage");
  const [tag, setTag] = useState(clip?.tags?.[0] ?? "3K");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title for this highlight.");
    if (!clip && !file) return setError("Choose a video file to upload.");
    setBusy(true);
    setError("");
    try {
      await onSave({ title: title.trim(), map, tags: [tag], file, onProgress: setProgress });
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
            <span>{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ready to upload` : "MP4, WebM or MOV · leave empty to keep the current video"}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <div className="field"><label htmlFor="title">Highlight title</label><input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 1v3 clutch on Mirage" /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="map">Map</label><select id="map" value={map} onChange={e => setMap(e.target.value)}>{maps.slice(1).map(m => <option key={m}>{m}</option>)}</select></div>
            <div className="field"><label htmlFor="tag">Highlight type</label><select id="tag" value={tag} onChange={e => setTag(e.target.value)}>{["3K", "4K", "Ace", "1v2 clutch", "1v3 clutch", "Clutch", "Entry", "Retake"].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
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
        <button className="brand brand-button" onClick={onBack}><span className="brand-mark"><Crosshair size={19}/></span><span>CLUTCH<span className="brand-muted">ARCHIVE</span></span></button>
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
          {section === "Settings" && <><div className="page-title-row"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="subheading">Your site configuration.</p></div></div><div className="settings-card"><div><strong>Site name</strong><p>Shown in the header and browser tab.</p></div><span>Clutch Archive</span></div><div className="settings-card"><div><strong>Admin access</strong><p>Supabase Auth and owner allowlist.</p></div><span>Connected</span></div><div className="settings-card"><div><strong>Video storage</strong><p>Owner-restricted uploads with public playback for published clips.</p></div><span>Supabase Storage</span></div></>}
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
  const [admin, setAdmin] = useState(window.location.hash === "#admin");
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
      setAdmin(window.location.hash === "#admin");
      void loadClips(false);
    };
    window.addEventListener("hashchange", syncAdminRoute);
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
    setAdmin(false);
    window.location.hash = "";
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

  if (admin) return <AdminAccess onBack={goHome}>{(onSignOut) => <><AdminView clips={clips} loading={dataLoading} dataError={dataError} onBack={goHome} onSignOut={onSignOut} onAuthorized={loadAdminClips} onUpload={() => setUploadOpen(true)} onEdit={setEditingClip} onDelete={(id) => { void deleteClip(id).catch((error) => setDataError(error.message)); }} onFeature={featureClip} onLike={toggleLike}/>{uploadOpen && <HighlightFormModal onClose={() => setUploadOpen(false)} onSave={addClip} />}{editingClip && <HighlightFormModal clip={editingClip} onClose={() => setEditingClip(null)} onSave={updateClip} />}</>}</AdminAccess>;

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
          {dataError && <p className="auth-error" role="alert">{dataError}</p>}
          {dataLoading && <p className="section-description" role="status">Loading highlights…</p>}
          <div className="filters">
            <div className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search highlights..." /></div>
            <div className="filter-control"><Filter size={15}/><select value={mapFilter} onChange={e => setMapFilter(e.target.value)} aria-label="Filter by map">{maps.map(m => <option key={m}>{m}</option>)}</select><ChevronDown size={14}/></div>
            <div className="filter-control"><Grid2X2 size={15}/><select value={tagFilter} onChange={e => setTagFilter(e.target.value)} aria-label="Filter by highlight type">{["All types", "3K", "4K", "Ace", "clutch", "Retake", "Entry"].map(m => <option key={m}>{m}</option>)}</select><ChevronDown size={14}/></div>
            <div className="sort-control"><span>Sort</span><select value={sort} onChange={e => setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option></select></div>
          </div>
          <div className="clip-grid">{filtered.map(c => <ClipCard key={c.id} clip={c} onOpen={setModalClip} onLike={toggleLike}/>)}</div>
          {!dataLoading && !dataError && filtered.length === 0 && <div className="empty-state"><Search size={28}/><h3>No highlights found</h3><p>Try a different search or filter.</p><button className="secondary-button" onClick={() => {setSearch("");setMapFilter("All maps");setTagFilter("All types");}}>Clear filters</button></div>}
          <div className="load-more"><span/> <span>YOU'VE REACHED THE END FOR NOW</span> <span/></div>
        </section>
      </main>
      <footer id="about"><button className="brand brand-button" onClick={goHome}><span className="brand-mark"><Crosshair size={17}/></span><span>CLUTCH<span className="brand-muted">ARCHIVE</span></span></button><span>MADE FOR THE LOVE OF THE GAME.</span></footer>
      {modalClip && <Modal clip={clips.find((clip) => clip.id === modalClip.id) ?? modalClip} onClose={() => setModalClip(null)} onLike={toggleLike}/>}
    </div>
  );
}

export default App;
