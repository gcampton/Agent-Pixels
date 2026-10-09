import { test } from "node:test";
import assert from "node:assert/strict";
import { assetBaseFromPluginList } from "../assetBase.ts";

test("finds the plugin id by plugin key in the /api/plugins response", () => {
  const body = [
    { id: "55bc13bb", pluginKey: "kalmeria.plugin-kalmeria" },
    { id: "3c737503-92c8", pluginKey: "agent-pixels.camera" },
  ];
  assert.equal(assetBaseFromPluginList(body, "agent-pixels.camera"), "/_plugins/3c737503-92c8/ui/assets/");
});

test("accepts the { plugins: [...] } response shape", () => {
  const body = { plugins: [{ id: "x1", pluginKey: "agent-pixels.camera" }] };
  assert.equal(assetBaseFromPluginList(body, "agent-pixels.camera"), "/_plugins/x1/ui/assets/");
});

test("throws a clear error when the plugin is not in the list", () => {
  assert.throws(() => assetBaseFromPluginList([], "agent-pixels.camera"), /agent-pixels\.camera not found/);
});
