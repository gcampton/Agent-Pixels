import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

export const PLUGIN_ID = "agent-pixels.camera";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "agent-pixels";

export const SLOT_IDS = {
  sidebar: "agent-pixels-sidebar",
  page: "agent-pixels-camera-page",
} as const;

export const EXPORT_NAMES = {
  sidebar: "AgentPixelsSidebarLink",
  page: "AgentPixelsCameraPage",
} as const;

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Agent Pixels",
  description: "Security camera style pixel office view for Paperclip companies.",
  author: "Garratt Campton",
  categories: ["ui"],
  capabilities: ["companies.read", "agents.read", "ui.sidebar.register", "ui.page.register"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "sidebar",
        id: SLOT_IDS.sidebar,
        displayName: "Agent Pixels",
        exportName: EXPORT_NAMES.sidebar,
      },
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Agent Pixels",
        exportName: EXPORT_NAMES.page,
        routePath: PAGE_ROUTE,
      },
    ],
  },
};

export default manifest;
