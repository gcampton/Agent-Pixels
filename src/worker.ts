import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { PLUGIN_ID } from "./manifest.js";

type ActivityKind = "coding" | "research" | "writing" | "meeting" | "idle";

function inferActivityKind(agent: { name: string; title: string | null; role: string; status: string }): ActivityKind {
  if (agent.status !== "running") return "idle";

  const text = `${agent.name} ${agent.title ?? ""} ${agent.role}`.toLowerCase();
  if (text.includes("research") || text.includes("seo") || text.includes("analyst")) return "research";
  if (text.includes("copy") || text.includes("content") || text.includes("writer") || text.includes("email")) return "writing";
  if (text.includes("ceo") || text.includes("cmo") || text.includes("strateg")) return "meeting";
  if (text.includes("engineer") || text.includes("devops") || text.includes("cto") || text.includes("software")) return "coding";

  return agent.status === "running" || agent.status === "active" ? "coding" : "idle";
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Agent Pixels plugin setup complete");

    ctx.data.register("camera-room", async (params) => {
      const companyId = typeof params.companyId === "string" ? params.companyId : null;
      const agents = companyId ? await ctx.agents.list({ companyId, limit: 100, offset: 0 }) : [];

      return {
        room: "Office",
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          urlKey: agent.urlKey,
          activityKind: inferActivityKind(agent),
        })),
      };
    });

    ctx.data.register("character-settings", async (params) => {
      const companyId = typeof params.companyId === "string" ? params.companyId : null;
      const agents = companyId ? await ctx.agents.list({ companyId, limit: 100, offset: 0 }) : [];

      return {
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          urlKey: agent.urlKey,
        })),
      };
    });
  },

  async onHealth() {
    return { status: "ok", message: `${PLUGIN_ID} ready` };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
