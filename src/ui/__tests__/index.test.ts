import { test } from "node:test";
import assert from "node:assert/strict";
import { characterAssetsFromIndex } from "../assetBase.ts";

test("character picker URLs are built from the resolved asset base", () => {
  assert.deepEqual(characterAssetsFromIndex("/_plugins/id1/ui/assets/", ["characters/char_0.png", "characters/char_1.png"]), [
    { index: 0, path: "characters/char_0.png", url: "/_plugins/id1/ui/assets/characters/char_0.png" },
    { index: 1, path: "characters/char_1.png", url: "/_plugins/id1/ui/assets/characters/char_1.png" },
  ]);
});

test("a missing character list yields no characters instead of crashing", () => {
  assert.deepEqual(characterAssetsFromIndex("/x/", undefined), []);
});
