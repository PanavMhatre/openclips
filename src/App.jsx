import { useEffect, useMemo, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Podcasts", icon: "home", tab: "podcasts" },
  { label: "Sports", icon: "trophy", tab: "sports" },
];

const BUFFER_TEXT_LIMIT = 2200;

function defaultScheduleDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const minutes = Math.ceil(date.getMinutes() / 15) * 15;
  date.setMinutes(minutes, 0, 0);
  return toDateTimeLocalValue(date);
}

function toDateTimeLocalValue(date) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function defaultBufferText(project, clip) {
  const clipTags = (clip?.tags || [])
    .map((tag) => String(tag || "").replace(/[^a-z0-9]+/gi, ""))
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `#${tag}`);
  const defaultTags = project?.genre === "Sports"
    ? clipTags
    : ["#FinanceTok", "#TechTok", "#Startups", "#AI"];
  const tags = defaultTags.slice(0, 4).join(" ");
  return [
    clip?.hook || clip?.title,
    clip?.focus || clip?.reasoning,
    tags,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, BUFFER_TEXT_LIMIT);
}

function App() {
  const [activeTab, setActiveTab] = useState("podcasts");
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [selectedClipId, setSelectedClipId] = useState("");
  const [form, setForm] = useState({
    sourceUrl: "",
    prompt:
      "Find finance and tech podcast clips that explain money, AI, startups, investing, or strategy in a fast, useful way for younger short-form viewers.",
    clipModel: "Podcast",
    genre: "Podcast",
    clipLength: "Auto",
    layout: "speaker",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const hasActiveWork = projects.some((project) =>
      ["queued", "fetching", "transcribing", "analyzing", "rendering", "scheduling"].includes(
        project.status,
      ),
    );
    const timer = window.setInterval(
      fetchProjects,
      hasActiveWork ? 1500 : 5000,
    );
    return () => window.clearInterval(timer);
  }, [projects]);

  const activeProject = useMemo(() => {
    if (!projects.length) return null;
    return (
      projects.find((project) => project.id === activeProjectId) || projects[0]
    );
  }, [projects, activeProjectId]);

  const selectedClip = useMemo(() => {
    if (!activeProject?.clips?.length) return null;
    return (
      activeProject.clips.find((clip) => clip.id === selectedClipId) ||
      activeProject.clips[0]
    );
  }, [activeProject, selectedClipId]);

  useEffect(() => {
    if (activeProject && !activeProjectId) {
      setActiveProjectId(activeProject.id);
    }
    if (activeProject?.clips?.length && !selectedClipId) {
      setSelectedClipId(activeProject.clips[0].id);
    }
  }, [activeProject, activeProjectId, selectedClipId]);

  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) return;
      const data = await response.json();
      setProjects((data.projects || []).filter((p) => p.genre !== "Sports"));
    } catch {
      /* polling will retry */
    }
  }

  async function submitProject(event) {
    event.preventDefault();
    setError("");
    if (!videoFile && !form.sourceUrl.trim()) {
      setError("Drop a video file or paste a public video URL.");
      return;
    }
    setIsSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (videoFile) body.append("video", videoFile);
      const response = await fetch("/api/projects", { method: "POST", body });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Project could not be created.");
      setProjects((items) => [data.project, ...items]);
      setActiveProjectId(data.project.id);
      setSelectedClipId("");
      setForm((current) => ({ ...current, sourceUrl: "" }));
      setVideoFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (submitError) {
      setError(submitError.message || "Project could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteProject(projectId) {
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setProjects((items) => items.filter((project) => project.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId("");
      setSelectedClipId("");
    }
  }

  function refreshProjects() {
    fetchProjects();
  }

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-pane">
        {activeTab === "sports" ? (
          <SportsPage />
        ) : (
          <div className="podcast-page">
            <Topbar />
            <div
              className={
                selectedClip ? "podcast-layout has-editor" : "podcast-layout no-editor"
              }
            >
              <div className="podcast-left">
                <HeroPanel
                  form={form}
                  setForm={setForm}
                  videoFile={videoFile}
                  setVideoFile={setVideoFile}
                  fileInput={fileInput}
                  isSubmitting={isSubmitting}
                  error={error}
                  onSubmit={submitProject}
                />
                <ProjectResults
                  projects={projects}
                  activeProject={activeProject}
                  selectedClip={selectedClip}
                  selectedClipId={selectedClipId}
                  setActiveProjectId={setActiveProjectId}
                  setSelectedClipId={setSelectedClipId}
                  deleteProject={deleteProject}
                  refreshProjects={refreshProjects}
                />
              </div>
              {selectedClip ? (
                <div className="editor-column">
                  <EditorPanel
                    project={activeProject}
                    clip={selectedClip}
                    refreshProjects={refreshProjects}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <span className="brand-mark">
          <Icon name="play" />
        </span>
        <span>OpenClips</span>
      </div>
      <nav className="side-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.tab}
            className={activeTab === item.tab ? "nav-item active" : "nav-item"}
            type="button"
            onClick={() => setActiveTab(item.tab)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({ title = "Podcast clips", description }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>
          {description ||
            "Turn long podcast episodes into speaker-locked downloadable shorts."}
        </p>
      </div>
    </header>
  );
}

function HeroPanel({
  form,
  setForm,
  videoFile,
  setVideoFile,
  fileInput,
  isSubmitting,
  error,
  onSubmit,
}) {
  return (
    <section className="hero-panel">
      <div className="panel-heading">
        <div>
          <span>Podcast workflow</span>
          <h2>Create podcast clips</h2>
        </div>
        <strong>Speaker locked</strong>
      </div>
      <form className="upload-console" onSubmit={onSubmit}>
        <label className="source-input">
          <Icon name="link" />
          <input
            value={form.sourceUrl}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sourceUrl: event.target.value,
              }))
            }
            placeholder="Paste a YouTube podcast episode or video interview link"
          />
        </label>
        <div
          className="drop-zone"
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setVideoFile(event.dataTransfer.files?.[0] || null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <Icon name="upload" />
          <div>
            <strong>
              {videoFile ? videoFile.name : "Upload podcast recording"}
            </strong>
            <span>
              MP4, MOV, M4V, WebM, or any ffmpeg-readable podcast source
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
            hidden
          />
        </div>
        <div className="podcast-mode-card">
          <span>Podcast only</span>
          <strong>Auto hook, guest context, fixed speaker crop</strong>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <button
          className="primary-action"
          type="submit"
          disabled={isSubmitting}
        >
          <Icon name="spark" />
          {isSubmitting ? "Submitting..." : "Generate podcast clips"}
        </button>
      </form>
    </section>
  );
}

function ProjectResults({
  projects,
  activeProject,
  selectedClip,
  selectedClipId,
  setActiveProjectId,
  setSelectedClipId,
  deleteProject,
  refreshProjects,
}) {
  const [projectListOpen, setProjectListOpen] = useState(true);

  return (
    <section className="results-panel">
      <div className="section-title">
        <div>
          <h2>Podcast projects</h2>
          <p>
            {projects.length
              ? `${projects.length} podcast project${projects.length === 1 ? "" : "s"} in this workspace`
              : "Processed podcasts will appear here."}
          </p>
        </div>
        {projects.length > 0 && (
          <button
            className="ghost-button collapse-toggle"
            type="button"
            aria-label={
              projectListOpen ? "Collapse project list" : "Expand project list"
            }
            onClick={() => setProjectListOpen((v) => !v)}
          >
            <Icon name={projectListOpen ? "chevron-up" : "chevron-down"} />
            {projectListOpen
              ? "Collapse"
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {projects.length && projectListOpen ? (
        <div className="project-strip">
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              className={
                activeProject?.id === project.id
                  ? "project-chip active"
                  : "project-chip"
              }
              onClick={() => {
                setActiveProjectId(project.id);
                setSelectedClipId("");
              }}
            >
              <span>{project.title}</span>
              <small>{project.statusLabel}</small>
            </button>
          ))}
        </div>
      ) : null}

      {activeProject ? (
        <ProjectDetail
          project={activeProject}
          selectedClip={selectedClip}
          selectedClipId={selectedClipId}
          setSelectedClipId={setSelectedClipId}
          deleteProject={deleteProject}
          refreshProjects={refreshProjects}
        />
      ) : (
        <EmptyState />
      )}
    </section>
  );
}

function ProjectDetail({
  project,
  selectedClipId,
  setSelectedClipId,
  deleteProject,
  refreshProjects,
}) {
  const [isRerendering, setIsRerendering] = useState(false);
  const [rerunError, setRerunError] = useState("");
  const isWorking = [
    "queued",
    "fetching",
    "transcribing",
    "analyzing",
    "rendering",
    "scheduling",
  ].includes(project.status);
  const context = project.sourceContext || {};

  async function handleRerun() {
    setIsRerendering(true);
    setRerunError("");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/reprocess`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Re-run failed.");
      }
      setSelectedClipId("");
      refreshProjects();
    } catch (err) {
      setRerunError(err.message || "Re-run failed.");
    } finally {
      setIsRerendering(false);
    }
  }

  return (
    <div className="project-detail">
      <div className="project-head">
        <div>
          <h3>{project.title}</h3>
          <p>
            {[
              context.guest || context.topic || "Podcast",
              context.channel || project.sourceChannel,
              project.aiMode,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="project-head-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={handleRerun}
            disabled={isWorking || isRerendering}
            title="Re-run Groq analysis, pick new clips, and render them"
          >
            <Icon name="refresh" />
            {isRerendering ? "Starting…" : "Re-run AI"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => deleteProject(project.id)}
          >
            <Icon name="trash" />
            Remove
          </button>
        </div>
      </div>

      {isWorking ? (
        <div className="progress-card">
          <div className="progress-row">
            <strong>{project.statusLabel}</strong>
            <span>{project.progress}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          <p>
            Keep this app open while OpenClips imports, analyzes, and renders
            your clips.
          </p>
        </div>
      ) : null}

      {project.status === "failed" ? (
        <div className="error-card">
          <strong>Processing failed</strong>
          <p>{project.error}</p>
        </div>
      ) : null}

      {rerunError ? (
        <div className="error-card">
          <strong>Re-run failed</strong>
          <p>{rerunError}</p>
        </div>
      ) : null}

      {project.clips?.length ? (
        <>
          <div className="clip-toolbar">
            <div>
              <strong>{project.clips.length} podcast clips generated</strong>
              <span>Hooks and crops are generated from episode context</span>
            </div>
          </div>
          <div className="clip-grid">
            {project.clips
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  selected={clip.id === selectedClipId}
                  onSelect={() => setSelectedClipId(clip.id)}
                />
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ClipCard({ clip, selected, onSelect }) {
  return (
    <article
      className={selected ? "clip-card selected" : "clip-card"}
      onClick={onSelect}
    >
      <div className="clip-thumb">
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" />
        ) : (
          <div className="thumb-placeholder" />
        )}
        <span className="score-badge">{clip.score}</span>
        <span className="duration-badge">{formatDuration(clip.duration)}</span>
      </div>
      <div className="clip-meta">
        <h4>{clip.title}</h4>
        <p>{clip.focus || clip.hook || clip.reasoning}</p>
      </div>
      <div className="clip-actions">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <Icon name="edit" />
          Edit
        </button>
        <a
          href={clip.downloadUrl}
          download
          onClick={(event) => event.stopPropagation()}
        >
          <Icon name="download" />
          Download HD
        </a>
      </div>
    </article>
  );
}

function clipMediaUrl(url, clip) {
  if (!url) return "";
  const version = clip?.renderedAt || clip?.updatedAt || clip?.id || "";
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${encodeURIComponent(version)}`;
}

function EditorPanel({ project, clip, refreshProjects }) {
  // Local editable state — synced from clip prop when clip changes
  const [edits, setEdits] = useState({
    hook: "",
    title: "",
    focus: "",
    reasoning: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reset edits whenever the selected clip changes
  useEffect(() => {
    if (clip) {
      setEdits({
        hook: clip.hook || clip.title || "",
        title: clip.title || "",
        focus: clip.focus || "",
        reasoning: clip.reasoning || "",
      });
      setIsDirty(false);
      setSaveError("");
    }
  }, [clip?.id]);

  function handleChange(field, value) {
    setEdits((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!project || !clip) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/clips/${clip.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hook: edits.hook,
            title: edits.title,
            focus: edits.focus,
            reasoning: edits.reasoning,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Save failed.");
      }
      setIsDirty(false);
      refreshProjects();
    } catch (err) {
      setSaveError(err.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRerenderClip() {
    if (!project || !clip) return;
    setSaveError("");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/clips/${clip.id}/rerender`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Re-render failed.");
      }
      refreshProjects();
    } catch (err) {
      setSaveError(err.message || "Re-render failed.");
    }
  }

  function handleDiscard() {
    if (clip) {
      setEdits({
        hook: clip.hook || clip.title || "",
        title: clip.title || "",
        focus: clip.focus || "",
        reasoning: clip.reasoning || "",
      });
      setIsDirty(false);
      setSaveError("");
    }
  }

  const isRendering = project?.status === "rendering";

  return (
    <aside className="editor-panel">
      <div className="editor-head">
        <div>
          <span>Editor</span>
          <h2>{clip ? clip.title : "Select a clip"}</h2>
        </div>
      </div>
      {clip ? (
        <>
          <p className="preview-render-note">
            {isDirty
              ? "Preview shows the last render. Save & re-render to bake your edits into the clip."
              : "Preview is the rendered clip — hook and captions are baked into the video."}
          </p>
          <div className="phone-preview">
            {isRendering ? (
              <div className="preview-rendering">
                <strong>{project.statusLabel || "Rendering clip…"}</strong>
                <span>{project.progress || 0}%</span>
              </div>
            ) : null}
            <video
              key={clipMediaUrl(clip.downloadUrl, clip)}
              src={clipMediaUrl(clip.downloadUrl, clip)}
              controls
              playsInline
              poster={clip.thumbnailUrl}
            />
          </div>
          <div className="editor-actions">
            <button
              className="ghost-button compact"
              type="button"
              onClick={handleRerenderClip}
              disabled={isRendering || isSaving || isDirty}
              title={
                isDirty
                  ? "Save your edits first"
                  : "Re-render this clip with the current text"
              }
            >
              <Icon name="refresh" />
              Re-render
            </button>
            <a
              className="primary-action compact"
              href={clip.downloadUrl}
              download
            >
              <Icon name="download" />
              Download
            </a>
            <a className="ghost-link" href={clip.srtUrl} download>
              <Icon name="captions" />
              SRT
            </a>
            <a className="ghost-link" href={clip.xmlUrl} download>
              <Icon name="code" />
              XML
            </a>
          </div>
          <div className="score-panel">
            <div className="score-number">{clip.score}</div>
            <div>
              <strong>Virality score</strong>
              <p>
                {clip.emotion} · {formatDuration(clip.duration)} ·{" "}
                {formatTime(clip.start)} to {formatTime(clip.end)}
              </p>
            </div>
          </div>
          <div className="editor-tabs">
            <button className="active" type="button">
              Captions
            </button>
          </div>
          <div className="caption-list">
            <label>
              <span>Hook headline</span>
              <input
                value={edits.hook}
                onChange={(e) => handleChange("hook", e.target.value)}
                placeholder="Hook headline"
              />
            </label>
            <label>
              <span>AI title</span>
              <input
                value={edits.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Clip title"
              />
            </label>
          </div>
          {saveError ? <p className="form-error">{saveError}</p> : null}
          {isDirty ? (
            <div className="editor-save-row">
              <button
                className="primary-action compact"
                type="button"
                onClick={handleSave}
                disabled={isSaving || isRendering}
              >
                <Icon name="save" />
                {isSaving
                  ? "Saving…"
                  : isRendering
                    ? "Rendering…"
                    : "Save & re-render"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={handleDiscard}
              >
                Discard
              </button>
            </div>
          ) : null}
          <BufferScheduler
            project={project}
            clip={clip}
            routeBase="projects"
            refreshProjects={refreshProjects}
          />
        </>
      ) : (
        <div className="empty-editor">
          <Icon name="play" />
          <p>
            {project
              ? "Generated clips will be editable here."
              : "Submit a video to start clipping."}
          </p>
        </div>
      )}
    </aside>
  );
}

function BufferScheduler({ project, clip, routeBase, refreshProjects }) {
  const [configured, setConfigured] = useState(true);
  const [channels, setChannels] = useState([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("customScheduled");
  const [dueAt, setDueAt] = useState(defaultScheduleDateTime);
  const [mediaUrl, setMediaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    setText(defaultBufferText(project, clip));
    setDueAt(defaultScheduleDateTime());
    setMediaUrl("");
    setError("");
    setResult(null);
  }, [project?.id, clip?.id]);

  useEffect(() => {
    let ignore = false;
    async function loadChannels() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/buffer/channels");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Could not load Buffer channels.");
        }
        if (ignore) return;
        setConfigured(data.configured !== false);
        setChannels(data.channels || []);
        setSelectedChannelIds((data.channels || []).map((channel) => channel.id));
        if (data.configured === false) {
          setError(data.error || "Buffer API key is not configured.");
        }
      } catch (loadError) {
        if (!ignore) {
          setChannels([]);
          setSelectedChannelIds([]);
          setError(loadError.message || "Could not load Buffer channels.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadChannels();
    return () => {
      ignore = true;
    };
  }, []);

  const selectedCount = selectedChannelIds.length;
  const allSelected = channels.length > 0 && selectedCount === channels.length;

  function toggleChannel(channelId) {
    setSelectedChannelIds((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId],
    );
  }

  async function scheduleClip() {
    if (!project || !clip || isScheduling) return;
    setError("");
    setResult(null);
    if (!configured) {
      setError("Buffer API key is not configured.");
      return;
    }
    if (!selectedChannelIds.length) {
      setError("Select at least one channel.");
      return;
    }
    if (!text.trim()) {
      setError("Add post text.");
      return;
    }
    if (mode === "customScheduled" && !dueAt) {
      setError("Choose a schedule time.");
      return;
    }

    setIsScheduling(true);
    try {
      const payload = {
        channelIds: selectedChannelIds,
        text: text.trim(),
        mode,
        mediaUrl: mediaUrl.trim(),
      };
      if (mode === "customScheduled") {
        payload.dueAt = new Date(dueAt).toISOString();
      }
      const response = await fetch(
        `/api/${routeBase}/${project.id}/clips/${clip.id}/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Buffer scheduling failed.");
      }
      setResult(data);
      if (data.failed?.length) {
        setError(`${data.failed.length} channel${data.failed.length === 1 ? "" : "s"} failed.`);
      }
      refreshProjects?.();
    } catch (scheduleError) {
      setError(scheduleError.message || "Buffer scheduling failed.");
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <section className="buffer-scheduler">
      <div className="buffer-header">
        <div>
          <span>Buffer</span>
          <h3>Schedule clip</h3>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() =>
            setSelectedChannelIds(allSelected ? [] : channels.map((channel) => channel.id))
          }
          disabled={!channels.length || isLoading}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <div className="buffer-mode-toggle" aria-label="Buffer mode">
        <button
          className={mode === "customScheduled" ? "active" : ""}
          type="button"
          onClick={() => setMode("customScheduled")}
        >
          <Icon name="calendar" />
          Schedule
        </button>
        <button
          className={mode === "addToQueue" ? "active" : ""}
          type="button"
          onClick={() => setMode("addToQueue")}
        >
          <Icon name="send" />
          Queue
        </button>
      </div>

      {mode === "customScheduled" ? (
        <label className="buffer-field">
          <span>Publish time</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </label>
      ) : null}

      <label className="buffer-field">
        <span>Post text</span>
        <textarea
          value={text}
          maxLength={BUFFER_TEXT_LIMIT}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      <label className="buffer-field">
        <span>Public video URL</span>
        <input
          value={mediaUrl}
          onChange={(event) => setMediaUrl(event.target.value)}
          placeholder="Optional override: Discord upload is used first"
        />
      </label>

      <div className="buffer-channel-header">
        <span>{isLoading ? "Loading channels..." : `${selectedCount}/${channels.length} channels`}</span>
      </div>
      <div className="buffer-channel-grid">
        {channels.map((channel) => (
          <label key={channel.id} className="buffer-channel-row">
            <input
              type="checkbox"
              checked={selectedChannelIds.includes(channel.id)}
              onChange={() => toggleChannel(channel.id)}
            />
            {channel.avatar ? <img src={channel.avatar} alt="" /> : <span className="buffer-avatar" />}
            <span>
              <strong>{channel.displayName || channel.name}</strong>
              <small>
                {[channel.service, channel.organizationName, channel.isQueuePaused ? "paused" : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            </span>
          </label>
        ))}
        {!isLoading && configured && !channels.length ? (
          <p className="buffer-empty">No Buffer channels found.</p>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {result?.scheduled?.length ? (
        <p className="buffer-result">
          Scheduled to {result.scheduled.length} channel
          {result.scheduled.length === 1 ? "" : "s"}.
        </p>
      ) : null}

      <button
        className="primary-action compact buffer-submit"
        type="button"
        onClick={scheduleClip}
        disabled={isScheduling || isLoading || !channels.length}
      >
        <Icon name="calendar" />
        {isScheduling ? "Scheduling..." : "Schedule with Buffer"}
      </button>
    </section>
  );
}

// ─── Examples Page ────────────────────────────────────────────────────────────

// Sports Page

const SPORT_OPTIONS = [
  "Basketball",
  "Soccer",
  "Football",
  "Baseball",
  "Hockey",
  "Tennis",
  "Other",
];

function SportsPage() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [selectedClipId, setSelectedClipId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sport, setSport] = useState("Basketball");
  const [videoFile, setVideoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [projectListOpen, setProjectListOpen] = useState(true);
  const fileInput = useRef(null);

  useEffect(() => {
    fetchSportsProjects();
  }, []);

  useEffect(() => {
    const hasActiveWork = projects.some((p) =>
      ["queued", "fetching", "transcribing", "analyzing", "rendering", "scheduling"].includes(
        p.status,
      ),
    );
    const timer = window.setInterval(
      fetchSportsProjects,
      hasActiveWork ? 1500 : 5000,
    );
    return () => window.clearInterval(timer);
  }, [projects]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId],
  );

  const selectedClip = useMemo(() => {
    if (!activeProject?.clips?.length) return null;
    return (
      activeProject.clips.find((c) => c.id === selectedClipId) ||
      activeProject.clips[0]
    );
  }, [activeProject, selectedClipId]);

  useEffect(() => {
    if (activeProject && !activeProjectId) setActiveProjectId(activeProject.id);
    if (activeProject?.clips?.length && !selectedClipId)
      setSelectedClipId(activeProject.clips[0].id);
  }, [activeProject, activeProjectId, selectedClipId]);

  async function fetchSportsProjects() {
    try {
      const res = await fetch("/api/sports-projects");
      if (!res.ok) return;
      const data = await res.json();
      setProjects((data.projects || []).filter((p) => p.genre === "Sports"));
    } catch {
      /* polling will retry */
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!videoFile && !sourceUrl.trim()) {
      setError("Drop a video file or paste a public video URL.");
      return;
    }
    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append("sourceUrl", sourceUrl);
      body.append("sport", sport);
      if (videoFile) body.append("video", videoFile);
      const res = await fetch("/api/sports-projects", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create project.");
      setProjects((prev) => [data.project, ...prev]);
      setActiveProjectId(data.project.id);
      setSelectedClipId("");
      setSourceUrl("");
      setVideoFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setError(err.message || "Could not create project.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteProject(id) {
    await fetch(`/api/sports-projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId("");
      setSelectedClipId("");
    }
  }

  async function rerunProject(id) {
    const response = await fetch(`/api/sports-projects/${id}/rerun`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || "Re-run failed." };
    }
    setSelectedClipId("");
    fetchSportsProjects();
    return { ok: true };
  }

  return (
    <div className="sports-page">
      <Topbar
        title="Sports highlights"
        description="Upload a game or highlight reel — AI finds the key moments and clips them automatically."
      />

      <div
        className={
          selectedClip
            ? "sports-layout has-editor"
            : "sports-layout no-editor"
        }
      >
        <div className="sports-left">
          <section className="sports-upload-panel">
            <div className="panel-heading">
              <div>
                <span>Sports workflow</span>
                <h2>Create highlight clips</h2>
              </div>
              <strong>AI moment detection</strong>
            </div>
            <form className="upload-console" onSubmit={handleSubmit}>
              <label className="source-input">
                <Icon name="link" />
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste a YouTube game or highlight video link"
                />
              </label>
              <div
                className="drop-zone"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setVideoFile(e.dataTransfer.files?.[0] || null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <Icon name="upload" />
                <div>
                  <strong>
                    {videoFile ? videoFile.name : "Upload game footage"}
                  </strong>
                  <span>MP4, MOV, or any ffmpeg-readable video file</span>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  hidden
                />
              </div>
              <div className="sports-selector">
                {SPORT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={sport === s ? "sport-chip active" : "sport-chip"}
                    onClick={() => setSport(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {error ? <p className="form-error">{error}</p> : null}
              <button
                className="primary-action"
                type="submit"
                disabled={isSubmitting}
              >
                <Icon name="spark" />
                {isSubmitting ? "Submitting..." : "Find game moments"}
              </button>
            </form>
          </section>

          {projects.length > 0 && (
            <section className="results-panel">
              <div className="section-title">
                <div>
                  <h2>Sports projects</h2>
                  <p>
                    {projects.length} project{projects.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  className="ghost-button collapse-toggle"
                  type="button"
                  onClick={() => setProjectListOpen((v) => !v)}
                >
                  <Icon
                    name={projectListOpen ? "chevron-up" : "chevron-down"}
                  />
                  {projectListOpen
                    ? "Collapse"
                    : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
                </button>
              </div>
              {projectListOpen && (
                <div className="project-strip">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={
                        activeProject?.id === p.id
                          ? "project-chip active"
                          : "project-chip"
                      }
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setSelectedClipId("");
                      }}
                    >
                      <span>{p.title}</span>
                      <small>{p.statusLabel}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeProject ? (
            <SportsProjectDetail
              project={activeProject}
              selectedClipId={selectedClipId}
              setSelectedClipId={setSelectedClipId}
              deleteProject={deleteProject}
              rerunProject={rerunProject}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        {selectedClip ? (
          <div className="editor-column">
            <SportsClipPanel
              clip={selectedClip}
              project={activeProject}
              refreshProjects={fetchSportsProjects}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SportsProjectDetail({
  project,
  selectedClipId,
  setSelectedClipId,
  deleteProject,
  rerunProject,
}) {
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunError, setRerunError] = useState("");
  const isWorking = [
    "queued",
    "fetching",
    "transcribing",
    "analyzing",
    "rendering",
    "scheduling",
  ].includes(project.status);

  async function handleRerun() {
    setIsRerunning(true);
    setRerunError("");
    const result = await rerunProject(project.id);
    if (!result?.ok) {
      setRerunError(result?.error || "Re-run failed.");
    }
    setIsRerunning(false);
  }

  return (
    <div className="project-detail">
      <div className="project-head">
        <div>
          <h3>{project.title}</h3>
          <p>
            {[
              project.sport,
              project.sourceContext?.teams ||
                project.sourceContext?.channel ||
                project.sourceChannel,
              project.aiMode,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="project-head-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={handleRerun}
            disabled={isWorking || isRerunning}
            title="Re-run Groq analysis, pick new clips, and render them"
          >
            <Icon name="refresh" />
            {isRerunning ? "Starting…" : "Re-run AI"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => deleteProject(project.id)}
          >
            <Icon name="trash" />
            Remove
          </button>
        </div>
      </div>

      {isWorking && (
        <div className="progress-card">
          <div className="progress-row">
            <strong>{project.statusLabel}</strong>
            <span>{project.progress}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          <p>
            Keep this app open while OpenClips analyzes and renders your clips.
          </p>
        </div>
      )}

      {project.status === "failed" && (
        <div className="error-card">
          <strong>Processing failed</strong>
          <p>{project.error}</p>
        </div>
      )}

      {rerunError ? (
        <div className="error-card">
          <strong>Re-run failed</strong>
          <p>{rerunError}</p>
        </div>
      ) : null}

      {project.clips?.length > 0 && (
        <>
          <div className="clip-toolbar">
            <div>
              <strong>{project.clips.length} highlight clips found</strong>
              <span>Sorted by virality score</span>
            </div>
          </div>
          <div className="sports-clip-list">
            {project.clips
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((clip) => (
                <SportsClipRow
                  key={clip.id}
                  clip={clip}
                  selected={clip.id === selectedClipId}
                  onSelect={() => setSelectedClipId(clip.id)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function SportsClipRow({ clip, selected, onSelect }) {
  return (
    <article
      className={selected ? "sports-clip-row selected" : "sports-clip-row"}
      onClick={onSelect}
    >
      <div className="sports-clip-thumb">
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" />
        ) : (
          <div className="thumb-placeholder" />
        )}
        <span className="duration-badge">{formatDuration(clip.duration)}</span>
      </div>
      <div className="sports-clip-info">
        <h4>{clip.title}</h4>
        <div className="sports-clip-tags">
          {(clip.tags || []).map((tag) => (
            <span key={tag} className="sports-tag">
              {tag}
            </span>
          ))}
        </div>
        {clip.scoreboard && (
          <p className="sports-scoreboard-inline">{clip.scoreboard}</p>
        )}
      </div>
      <div className="clip-actions">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Icon name="edit" />
          View
        </button>
        <a
          href={clip.downloadUrl}
          download
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="download" />
          Download
        </a>
      </div>
    </article>
  );
}

function SportsClipPanel({ clip, project, refreshProjects }) {
  if (!clip) {
    return (
      <aside className="editor-panel">
        <div className="editor-head">
          <div>
            <span>Scene analysis</span>
            <h2>Select a clip</h2>
          </div>
        </div>
        <div className="empty-editor">
          <Icon name="trophy" />
          <p>
            {project
              ? "Select a clip to see scene analysis."
              : "Submit a game video to start."}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="editor-panel sports-analysis-panel">
      <div className="editor-head">
        <div>
          <span>Scene analysis</span>
          <h2>{clip.title}</h2>
        </div>
      </div>
      <div className="phone-preview">
        {project?.status === "rendering" ? (
          <div className="preview-rendering">
            <strong>{project.statusLabel || "Rendering clip…"}</strong>
            <span>{project.progress || 0}%</span>
          </div>
        ) : null}
        <video
          key={clipMediaUrl(clip.downloadUrl, clip)}
          src={clipMediaUrl(clip.downloadUrl, clip)}
          controls
          poster={clip.thumbnailUrl}
        />
      </div>

      <div className="editor-actions">
        <a className="primary-action compact" href={clip.downloadUrl} download>
          <Icon name="download" />
          Download
        </a>
        <a className="ghost-link" href={clip.srtUrl} download>
          <Icon name="captions" />
          SRT
        </a>
        <a className="ghost-link" href={clip.xmlUrl} download>
          <Icon name="code" />
          XML
        </a>
      </div>

      <div className="sports-analysis-head">
        <span className="example-label">Scene analysis</span>
        <div className="example-tags">
          {(clip.tags || []).map((tag) => (
            <span key={tag} className="example-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <p className="example-summary">{clip.reasoning}</p>

      {clip.scoreboard && (
        <div className="sports-scoreboard-card">
          <Icon name="trophy" />
          <strong>{clip.scoreboard}</strong>
        </div>
      )}

      <div className="score-panel">
        <div className="score-number">{clip.score}</div>
        <div>
          <strong>Virality score</strong>
          <p>
            {clip.emotion} · {formatDuration(clip.duration)} ·{" "}
            {formatTime(clip.start)} to {formatTime(clip.end)}
          </p>
        </div>
      </div>

      {clip.players && (
        <div className="example-players">
          <Icon name="users" />
          <span>{clip.players}</span>
        </div>
      )}

      <div className="caption-list">
        <label>
          <span>Hook text</span>
          <input value={clip.hook || clip.title} readOnly />
        </label>
      </div>

      <BufferScheduler
        project={project}
        clip={clip}
        routeBase="sports-projects"
        refreshProjects={refreshProjects}
      />
    </aside>
  );
}

// End Sports Page

function EmptyState() {
  return (
    <div className="empty-state">
      <Icon name="folder" />
      <h3>No projects yet</h3>
      <p>
        Paste a podcast episode or upload a recording to create your first
        downloadable clips.
      </p>
    </div>
  );
}

function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7h7l2 2h9v10H3z" />
        <path d="M3 7v12" />
      </>
    ),
    palette: (
      <>
        <path d="M12 22a10 10 0 1 1 10-10c0 2-1 3-3 3h-1.4c-1 0-1.6.8-1.2 1.7.7 1.8-.6 5.3-4.4 5.3Z" />
        <circle cx="7.5" cy="10.5" r=".8" />
        <circle cx="11.5" cy="7.5" r=".8" />
        <circle cx="16.5" cy="10.5" r=".8" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6Z" />
        <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />
      </>
    ),
    play: (
      <>
        <path d="M9 6v12l10-6Z" />
        <path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    grid: (
      <>
        <path d="M4 4h7v7H4z" />
        <path d="M13 4h7v7h-7z" />
        <path d="M4 13h7v7H4z" />
        <path d="M13 13h7v7h-7z" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 15h10l1-15" />
      </>
    ),
    filter: (
      <>
        <path d="M4 5h16" />
        <path d="M7 12h10" />
        <path d="M10 19h4" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5" />
        <path d="M3 3l7 7" />
        <path d="M16 21h5v-5" />
        <path d="m14 14 7 7" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    captions: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 10h4" />
        <path d="M13 10h4" />
        <path d="M7 14h8" />
      </>
    ),
    code: (
      <>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
        <path d="m14 5-4 14" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    send: (
      <>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4Z" />
      </>
    ),
    "chevron-up": (
      <>
        <path d="m18 15-6-6-6 6" />
      </>
    ),
    "chevron-down": (
      <>
        <path d="m6 9 6 6 6-6" />
      </>
    ),
    examples: (
      <>
        <path d="M2 6h4v12H2z" />
        <path d="M10 6h4v12h-4z" />
        <path d="M18 6h4v12h-4z" />
        <path d="M6 12h4" />
        <path d="M14 12h4" />
      </>
    ),
    trophy: (
      <>
        <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
        <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
        <path d="M6 5h12v6a6 6 0 0 1-12 0V5z" />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] || paths.play}</svg>;
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default App;
