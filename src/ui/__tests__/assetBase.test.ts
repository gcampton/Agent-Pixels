import { test } from "node:test";
import assert from "node:assert/strict";
import { assetBaseFromModuleUrl } from "../assetBase.ts";

test("uses the module URL when the UI is not loaded from a blob", () => {
  assert.equal(
    assetBaseFromModuleUrl("http://localhost:3100/_plugins/abc/ui/index.js", "/KAL/agent-pixels"),
    "http://localhost:3100/_plugins/abc/ui/assets/",
  );
});

test("uses the iframe path when the module URL is a blob", () => {
  assert.equal(
    assetBaseFromModuleUrl("blob:http://localhost:3100/1234", "/_plugins/abc/ui/settings.html"),
    "/_plugins/abc/ui/assets/",
  );
});

test("returns null for a blob module on a company page, so the plugin list is consulted", () => {
  assert.equal(assetBaseFromModuleUrl("blob:http://localhost:3100/1234", "/KAL/agent-pixels"), null);
});
