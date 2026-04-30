import { useEffect, useRef, useState } from "react";
import { useHostContext, usePluginData, type PluginSidebarProps } from "@paperclipai/plugin-sdk/ui";
import { PAGE_ROUTE } from "../manifest.js";
import { PixelOfficeCanvas } from "./PixelOfficeCanvas.js";

type CameraRoomData = {
  room: string;
  agents: Array<{
    id: string;
    name: string;
    status?: string | null;
    urlKey?: string | null;
    activityKind?: "coding" | "research" | "writing" | "meeting" | "idle";
  }>;
};

type CameraId = "office" | "boardroomKitchen" | "overflowOffice";

function cameraPagePath(companyPrefix: string | null): string {
  return companyPrefix ? `/${companyPrefix}/${PAGE_ROUTE}` : `/${PAGE_ROUTE}`;
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
  const agents = data?.agents ?? [];
  const [camera, setCamera] = useState<CameraId>("office");

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
            onClick={() => setCamera("office")}
            style={{ ...styles.cameraTab, ...(camera === "office" ? styles.cameraTabActive : {}) }}
          >
            Camera 1
          </button>
          <button
            type="button"
            onClick={() => setCamera("boardroomKitchen")}
            style={{ ...styles.cameraTab, ...(camera === "boardroomKitchen" ? styles.cameraTabActive : {}) }}
          >
            Camera 2
          </button>
          <button
            type="button"
            onClick={() => setCamera("overflowOffice")}
            style={{ ...styles.cameraTab, ...(camera === "overflowOffice" ? styles.cameraTabActive : {}) }}
          >
            Camera 3
          </button>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>{loading ? "Connecting" : error ? "Offline" : "Live"}</div>
        </div>
      </header>

      <section aria-label="Agent Pixels office camera" style={styles.camera}>
        <PixelOfficeCanvas camera={camera} agents={agents.length ? agents : [{ id: "placeholder", name: "No agents yet", status: "waiting", activityKind: "idle" }]} />
        <div style={styles.scanlines} />
      </section>
    </main>
  );
}
