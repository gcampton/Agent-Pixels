import { useEffect, useMemo, useRef, useState } from "react";
import { TILE_SIZE } from "../office/types.js";
import { OfficeState } from "../office/engine/officeState.js";
import { startGameLoop } from "../office/engine/gameLoop.js";
import { renderFrame } from "../office/engine/renderer.js";
import { type CameraBounds, loadPixelAssets } from "./pixelAssets.js";

export type CameraAgent = {
  id: string;
  name: string;
  status?: string | null;
  activityKind?: "coding" | "research" | "writing" | "meeting" | "idle";
};

type PixelOfficeCanvasProps = {
  agents: CameraAgent[];
  camera: "office" | "boardroomKitchen" | "overflowOffice";
};

function stableNumericId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export function PixelOfficeCanvas({ agents, camera }: PixelOfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<OfficeState | null>(null);
  const cameraBoundsRef = useRef<Record<"office" | "boardroomKitchen" | "overflowOffice", CameraBounds> | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const agentMeta = useMemo(
    () => new Map(agents.map((agent) => [stableNumericId(agent.id), agent] as const)),
    [agents],
  );

  useEffect(() => {
    let cancelled = false;

    void loadPixelAssets()
      .then(({ layouts, cameraBounds }) => {
        if (cancelled) return;
        const office = new OfficeState(layouts.combined);
        cameraBoundsRef.current = cameraBounds;
        officeRef.current = office;
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const office = officeRef.current;
    if (!office || !ready) return;

    const incoming = new Set(agents.map((agent) => stableNumericId(agent.id)));
    for (const agent of agents) {
      const id = stableNumericId(agent.id);
      office.addAgent(id, undefined, undefined, undefined, true);
      const activity = agent.activityKind ?? "idle";
      const isWorking = activity !== "idle";
      office.setAgentActive(id, isWorking);
      office.setAgentTool(id, activity === "research" ? "Read" : isWorking ? "Edit" : null);
    }
    for (const id of office.characters.keys()) {
      if (!incoming.has(id)) office.removeAgent(id);
    }
  }, [agents, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const office = officeRef.current;
    const cameraBounds = cameraBoundsRef.current;
    if (!canvas || !wrap || !office || !cameraBounds || !ready) return;

    const activeCanvas = canvas;
    const activeWrap = wrap;

    function resize() {
      const rect = activeWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      activeCanvas.width = Math.max(1, Math.round(rect.width * dpr));
      activeCanvas.height = Math.max(1, Math.round(rect.height * dpr));
      activeCanvas.style.width = `${rect.width}px`;
      activeCanvas.style.height = `${rect.height}px`;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(activeWrap);

    const stop = startGameLoop(canvas, {
      update: (dt) => office.update(dt),
      render: (ctx) => {
        const layout = office.getLayout();
        const focus = cameraBounds[camera];
        const dpr = window.devicePixelRatio || 1;
        const fitZoom = Math.min(
          canvas.width / (focus.cols * TILE_SIZE),
          canvas.height / (focus.rows * TILE_SIZE),
        ) * 0.92;
        const zoom = Math.max(dpr, fitZoom);
        const mapCenterCol = layout.cols / 2;
        const mapCenterRow = layout.rows / 2;
        const focusCenterCol = focus.col + focus.cols / 2;
        const focusCenterRow = focus.row + focus.rows / 2;
        const panX = (mapCenterCol - focusCenterCol) * TILE_SIZE * zoom;
        const panY = (mapCenterRow - focusCenterRow) * TILE_SIZE * zoom;

        const { offsetX, offsetY } = renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          office.tileMap,
          office.furniture,
          Array.from(office.characters.values()),
          zoom,
          panX,
          panY,
          {
            selectedAgentId: null,
            hoveredAgentId: null,
            hoveredTile: null,
            seats: office.seats,
            characters: office.characters,
          },
          undefined,
          layout.tileColors,
          layout.cols,
          layout.rows,
        );

        ctx.save();
        ctx.font = `${Math.max(10, Math.floor(5 * zoom))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#f9fafb";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = Math.max(2, zoom);
        for (const character of office.characters.values()) {
          const name = agentMeta.get(character.id)?.name;
          if (!name) continue;
          const x = offsetX + character.x * zoom;
          const y = offsetY + (character.y + 8) * zoom;
          ctx.strokeText(name, x, y);
          ctx.fillText(name, x, y);
        }
        ctx.restore();
      },
    });

    return () => {
      observer.disconnect();
      stop();
    };
  }, [agentMeta, camera, ready]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "min(725px, calc(100vh - 185px))", minHeight: "520px" }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          {loadError ? `Camera failed: ${loadError}` : "Loading camera..."}
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </div>
  );
}
