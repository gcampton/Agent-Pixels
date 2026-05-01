import { useEffect, useMemo, useRef, useState } from "react";
import { useHostContext, usePluginData, type PluginSettingsPageProps, type PluginSidebarProps } from "@paperclipai/plugin-sdk/ui";
import { PAGE_ROUTE } from "../manifest.js";
import { PixelOfficeCanvas } from "./PixelOfficeCanvas.js";
import { getPluginAssetBaseUrl, type AssetIndex } from "./pixelAssets.js";

type CameraRoomData = {
  room: string;
  agents: Array<{
    id: string;
    name: string;
    status?: string | null;
    urlKey?: string | null;
    activityKind?: "coding" | "research" | "writing" | "meeting" | "idle";
    characterIndex?: number;
  }>;
};

type CharacterSettingsData = {
  agents: Array<{
    id: string;
    name: string;
    status?: string | null;
    urlKey?: string | null;
  }>;
};

type CameraId = "office" | "boardroomKitchen" | "overflowOffice";

function cameraPagePath(companyPrefix: string | null): string {
  return companyPrefix ? `/${companyPrefix}/${PAGE_ROUTE}` : `/${PAGE_ROUTE}`;
}

function assignmentsStorageKey(companyId: string | null): string {
  return `agent-pixels.character-assignments.${companyId ?? "instance"}`;
}

function readStoredAssignments(companyId: string | null): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(assignmentsStorageKey(companyId)) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] =>
        typeof entry[0] === "string" && typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 0,
      ),
    );
  } catch {
    return {};
  }
}

function writeStoredAssignments(companyId: string | null, assignments: Record<string, number>) {
  window.localStorage.setItem(assignmentsStorageKey(companyId), JSON.stringify(assignments));
}

const styles = {
  link: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: 500,
    textDecoration: "none",
    borderRadius: "6px",
    color: "var(--foreground)",
  } as React.CSSProperties,
  linkActive: {
    background: "var(--accent)",
  } as React.CSSProperties,
  page: {
    minHeight: "100%",
    padding: "14px 24px 24px",
    color: "#e5e7eb",
    background: "#111827",
    fontFamily: "inherit",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    color: "#f9fafb",
  } as React.CSSProperties,
  title: {
    fontSize: "18px",
    fontWeight: 700,
  } as React.CSSProperties,
  cameraTabs: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  } as React.CSSProperties,
  cameraTab: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    padding: "5px 9px",
    borderRadius: "4px",
    cursor: "pointer",
    font: "inherit",
    fontSize: "12px",
  } as React.CSSProperties,
  cameraTabActive: {
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
  } as React.CSSProperties,
  camera: {
    position: "relative",
    overflow: "hidden",
    height: "min(725px, calc(100vh - 185px))",
    minHeight: "520px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#1f2937",
    imageRendering: "pixelated",
  } as React.CSSProperties,
  scanlines: {
    position: "absolute",
    inset: 0,
    background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 1px, transparent 1px, transparent 4px)",
    pointerEvents: "none",
  } as React.CSSProperties,
  floor: {
    position: "absolute",
    inset: "34% 0 0",
    background: "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), #374151",
    backgroundSize: "32px 32px",
  } as React.CSSProperties,
  desk: {
    position: "absolute",
    width: "132px",
    height: "54px",
    background: "#7c2d12",
    border: "4px solid #431407",
  } as React.CSSProperties,
  agent: {
    display: "none",
  } as React.CSSProperties,
} as const;

export function AgentPixelsSidebarLink({ context }: PluginSidebarProps) {
  const href = cameraPagePath(context.companyPrefix);
  const isActive = typeof window !== "undefined" && window.location.pathname.startsWith(href);

  return (
    <a href={href} aria-current={isActive ? "page" : undefined} style={{ ...styles.link, ...(isActive ? styles.linkActive : {}) }}>
      <span aria-hidden="true">▣</span>
      Agent Pixels
    </a>
  );
}

export function AgentPixelsCameraPage() {
  const pageRef = useRef<HTMLElement>(null);
  const { companyId } = useHostContext();
  const { data, loading, error } = usePluginData<CameraRoomData>("camera-room", { companyId });
  const [assignments, setAssignments] = useState<Record<string, number>>(() => readStoredAssignments(companyId ?? null));
  const agents = useMemo(
    () => (data?.agents ?? []).map((agent) => ({ ...agent, characterIndex: assignments[agent.id] })),
    [assignments, data?.agents],
  );
  const [camera, setCamera] = useState<CameraId>("office");
  const [view, setView] = useState<"camera" | "characters">("camera");

  useEffect(() => {
    setAssignments(readStoredAssignments(companyId ?? null));
  }, [companyId]);

  useEffect(() => {
    const hostSlot = pageRef.current?.parentElement;
    const hostBackRow = hostSlot?.previousElementSibling as HTMLElement | null;
    const hostWrapper = hostSlot?.parentElement as HTMLElement | null;
    const previousDisplay = hostBackRow?.style.display;
    const previousGap = hostWrapper?.style.gap;

    if (hostBackRow?.textContent?.includes("Back")) hostBackRow.style.display = "none";
    if (hostWrapper) hostWrapper.style.gap = "0";

    return () => {
      if (hostBackRow && previousDisplay !== undefined) hostBackRow.style.display = previousDisplay;
      if (hostWrapper && previousGap !== undefined) hostWrapper.style.gap = previousGap;
    };
  }, []);

  return (
    <main ref={pageRef} style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.title}>Agent Pixels</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            {camera === "office"
              ? "Office + Lounge"
              : camera === "boardroomKitchen"
                ? "Boardroom + Staff Kitchen"
                : "Overflow Office + Lounge"} Camera
          </div>
        </div>
        <div style={styles.cameraTabs}>
          <button
            type="button"
            onClick={() => {
              setView("camera");
              setCamera("office");
            }}
            style={{ ...styles.cameraTab, ...(view === "camera" && camera === "office" ? styles.cameraTabActive : {}) }}
          >
            Camera 1
          </button>
          <button
            type="button"
            onClick={() => {
              setView("camera");
              setCamera("boardroomKitchen");
            }}
            style={{ ...styles.cameraTab, ...(view === "camera" && camera === "boardroomKitchen" ? styles.cameraTabActive : {}) }}
          >
            Camera 2
          </button>
          <button
            type="button"
            onClick={() => {
              setView("camera");
              setCamera("overflowOffice");
            }}
            style={{ ...styles.cameraTab, ...(view === "camera" && camera === "overflowOffice" ? styles.cameraTabActive : {}) }}
          >
            Camera 3
          </button>
          <button
            type="button"
            onClick={() => setView("characters")}
            style={{ ...styles.cameraTab, ...(view === "characters" ? styles.cameraTabActive : {}) }}
          >
            Characters
          </button>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>{loading ? "Connecting" : error ? "Offline" : "Live"}</div>
        </div>
      </header>

      {view === "characters" ? (
        <CharacterAssignmentsPanel companyId={companyId ?? null} assignments={assignments} onAssignmentsChange={setAssignments} />
      ) : (
        <section aria-label="Agent Pixels office camera" style={styles.camera}>
          <PixelOfficeCanvas camera={camera} agents={agents.length ? agents : [{ id: "placeholder", name: "No agents yet", status: "waiting", activityKind: "idle" }]} />
          <div style={styles.scanlines} />
        </section>
      )}
    </main>
  );
}

function useCharacterAssets() {
  const [assets, setAssets] = useState<Array<{ index: number; path: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = getPluginAssetBaseUrl();
    fetch(`${baseUrl}agent-pixels-assets.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch character index: ${res.status}`);
        return res.json() as Promise<AssetIndex>;
      })
      .then((index) => {
        if (cancelled) return;
        setAssets(index.characters.map((path, index) => ({ index, path, url: `${baseUrl}${path}` })));
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { assets, error };
}

function SpritePreview({ url, scale = 2 }: { url: string; scale?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 16 * scale,
        height: 32 * scale,
        backgroundImage: `url(${url})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 0",
        backgroundSize: `${16 * scale * 7}px ${32 * scale * 3}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function CharacterAssignmentsPanel({
  companyId,
  assignments,
  onAssignmentsChange,
}: {
  companyId: string | null;
  assignments?: Record<string, number>;
  onAssignmentsChange?: (assignments: Record<string, number>) => void;
}) {
  const { data, loading, error, refresh } = usePluginData<CharacterSettingsData>("character-settings", companyId ? { companyId } : {});
  const { assets, error: assetError } = useCharacterAssets();
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);
  const [storedAssignments, setStoredAssignments] = useState<Record<string, number>>(() => assignments ?? readStoredAssignments(companyId));
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [draftIndex, setDraftIndex] = useState<number | null>(null);

  useEffect(() => {
    setStoredAssignments(assignments ?? readStoredAssignments(companyId));
  }, [assignments, companyId]);

  const agents = data?.agents ?? [];
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const selectedIndex = selectedAgent ? storedAssignments[selectedAgent.id] : undefined;
  const visibleIndex = draftIndex ?? selectedIndex;

  useEffect(() => {
    setDraftIndex(null);
  }, [selectedAgent?.id, selectedIndex]);

  async function updateAssignment(agentId: string, characterIndex: number | null) {
    setSavingAgentId(agentId);
    try {
      const next = { ...storedAssignments };
      if (characterIndex === null) delete next[agentId];
      else next[agentId] = characterIndex;
      writeStoredAssignments(companyId, next);
      setStoredAssignments(next);
      onAssignmentsChange?.(next);
      refresh();
    } finally {
      setSavingAgentId(null);
    }
  }

  if (loading) return <div style={{ padding: 24, fontSize: 13 }}>Loading Agent Pixels settings...</div>;
  if (error) return <div style={{ padding: 24, fontSize: 13 }}>Settings failed: {error.message}</div>;

  function randomIndex(): number | null {
    if (assets.length === 0) return null;
    const used = new Set(Object.values(storedAssignments));
    const open = assets.filter((asset) => !used.has(asset.index) || asset.index === selectedIndex);
    const pool = open.length > 0 ? open : assets;
    return pool[Math.floor(Math.random() * pool.length)]?.index ?? null;
  }

  return (
    <section style={{ padding: "18px", display: "grid", gap: "14px", color: "var(--foreground)", background: "var(--background, #111827)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: "inherit" }}>
      {assetError ? <div style={{ fontSize: "13px", color: "var(--destructive, #ef4444)" }}>{assetError}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
        <aside style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6, overflow: "hidden", background: "rgba(15,23,42,0.35)" }}>
          <div style={{ padding: "12px", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid rgba(148,163,184,0.25)" }}>Agents</div>
          <div style={{ maxHeight: "610px", overflow: "auto" }}>
            {agents.map((agent) => {
              const assigned = storedAssignments[agent.id];
              const assignedAsset = assets[assigned] ?? null;
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.id)}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr 42px",
                    gap: "8px",
                    alignItems: "center",
                    padding: "9px 10px",
                    border: 0,
                    borderBottom: "1px solid rgba(148,163,184,0.16)",
                    background: isSelected ? "rgba(59,130,246,0.18)" : "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "13px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </span>
                    <span style={{ display: "block", fontSize: "11px", opacity: 0.65 }}>{assignedAsset ? `char_${assigned}` : "Auto"}</span>
                  </span>
                  <span style={{ width: 36, height: 48, display: "grid", placeItems: "center", background: "rgba(148,163,184,0.12)", borderRadius: 4 }}>
                    {assignedAsset ? <SpritePreview url={assignedAsset.url} scale={1.5} /> : <span style={{ fontSize: 10, opacity: 0.65 }}>Auto</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedAgent?.name ?? "No agents"}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                {visibleIndex !== undefined && visibleIndex !== null ? `Selected char_${visibleIndex}` : "Using automatic sprite"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {selectedAgent ? (
                <button
                  type="button"
                  disabled={savingAgentId === selectedAgent.id || draftIndex === null}
                  onClick={() => void updateAssignment(selectedAgent.id, draftIndex)}
                  style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(59,130,246,0.22)", color: "inherit", cursor: draftIndex === null ? "default" : "pointer" }}
                >
                  Save
                </button>
              ) : null}
              {selectedAgent ? (
                <button
                  type="button"
                  disabled={savingAgentId === selectedAgent.id || assets.length === 0}
                  onClick={() => {
                    const next = randomIndex();
                    if (next !== null) setDraftIndex(next);
                  }}
                  style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(148,163,184,0.35)", background: "transparent", color: "inherit", cursor: "pointer" }}
                >
                  Random
                </button>
              ) : null}
              {selectedAgent && selectedIndex !== undefined ? (
              <button
                type="button"
                disabled={savingAgentId === selectedAgent.id}
                onClick={() => void updateAssignment(selectedAgent.id, null)}
                style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(148,163,184,0.35)", background: "transparent", color: "inherit", cursor: "pointer" }}
              >
                Reset
              </button>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
              gap: "8px",
              maxHeight: "610px",
              overflow: "auto",
              padding: "10px",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 6,
              background: "rgba(15,23,42,0.3)",
            }}
          >
            {assets.map((asset) => (
              <button
                key={asset.path}
                type="button"
                disabled={!selectedAgent || savingAgentId === selectedAgent.id}
                onClick={() => setDraftIndex(asset.index)}
                title={asset.path.replace("characters/", "").replace(".png", "")}
                style={{
                  height: 82,
                  display: "grid",
                  placeItems: "center",
                  border: asset.index === visibleIndex ? "2px solid #60a5fa" : "1px solid rgba(148,163,184,0.25)",
                  borderRadius: 6,
                  background: asset.index === visibleIndex ? "rgba(59,130,246,0.2)" : "rgba(148,163,184,0.08)",
                  cursor: selectedAgent ? "pointer" : "default",
                }}
              >
                <SpritePreview url={asset.url} scale={2} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export function AgentPixelsSettingsPage({ context }: PluginSettingsPageProps) {
  return (
    <main style={{ padding: 24 }}>
      <CharacterAssignmentsPanel companyId={context.companyId ?? null} />
    </main>
  );
}
