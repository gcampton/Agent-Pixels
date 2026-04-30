#!/usr/bin/env node

import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const paperclipSdkRoot = "/home/garratt/dev/4_repos/paperclip/packages/plugins/sdk/dist";

const paperclipSdkAlias = {
  name: "paperclip-sdk-alias",
  setup(build) {
    build.onResolve({ filter: /^@paperclipai\/plugin-sdk$/ }, () => ({
      path: path.join(paperclipSdkRoot, "index.js"),
    }));
  },
};

await mkdir(path.join(root, "dist/ui"), { recursive: true });

function flattenFurnitureManifest(manifest, dirName, inherited = {}) {
  const fileName = manifest.file ?? `${manifest.id}.png`;
  const base = {
    category: manifest.category ?? inherited.category ?? "misc",
    groupId: manifest.type === "group" ? manifest.id : inherited.groupId,
    orientation: manifest.orientation ?? inherited.orientation,
    state: manifest.state ?? inherited.state,
    rotationScheme: manifest.rotationScheme ?? inherited.rotationScheme,
    animationGroup: manifest.groupType === "animation" ? manifest.id : inherited.animationGroup,
    canPlaceOnSurfaces: manifest.canPlaceOnSurfaces ?? inherited.canPlaceOnSurfaces,
    backgroundTiles: manifest.backgroundTiles ?? inherited.backgroundTiles,
    canPlaceOnWalls: manifest.canPlaceOnWalls ?? inherited.canPlaceOnWalls,
    mirrorSide: manifest.mirrorSide ?? inherited.mirrorSide,
  };

  if (manifest.type === "asset") {
    return [{
      id: manifest.id,
      label: manifest.name ?? inherited.name ?? manifest.id,
      category: base.category,
      width: manifest.width,
      height: manifest.height,
      footprintW: manifest.footprintW,
      footprintH: manifest.footprintH,
      isDesk: base.category === "desks",
      groupId: base.groupId,
      orientation: base.orientation,
      state: base.state,
      rotationScheme: base.rotationScheme,
      animationGroup: base.animationGroup,
      frame: manifest.frame,
      canPlaceOnSurfaces: !!base.canPlaceOnSurfaces,
      backgroundTiles: base.backgroundTiles,
      canPlaceOnWalls: !!base.canPlaceOnWalls,
      mirrorSide: !!base.mirrorSide,
      furniturePath: `furniture/${dirName}/${fileName}`,
    }];
  }

  return (manifest.members ?? []).flatMap((member) =>
    flattenFurnitureManifest(member, dirName, {
      ...base,
      name: manifest.name ?? inherited.name,
    }),
  );
}

async function writeAssetIndex() {
  const publicDir = path.join(root, "public");
  const assetsDir = path.join(publicDir, "assets");
  await cp(assetsDir, path.join(root, "dist/ui/assets"), { recursive: true });

  const furnitureRoot = path.join(assetsDir, "furniture");
  const furnitureDirs = await readdir(furnitureRoot, { withFileTypes: true });
  const furniture = [];
  for (const entry of furnitureDirs) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(furnitureRoot, entry.name, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    furniture.push(...flattenFurnitureManifest(manifest, entry.name));
  }

  const index = {
    characters: (await readdir(path.join(assetsDir, "characters")))
      .filter((name) => /^char_\d+\.png$/i.test(name))
      .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))
      .map((name) => `characters/${name}`),
    floors: ["floors/floor_0.png", "floors/floor_1.png", "floors/floor_2.png", "floors/floor_3.png", "floors/floor_4.png", "floors/floor_5.png", "floors/floor_6.png", "floors/floor_7.png", "floors/floor_8.png"],
    walls: ["walls/wall_0.png"],
    furniture,
    layouts: {
      office: "default-layout-1.json",
      boardroomKitchen: "agent-pixels-layout-boardroom-kitchen.json",
    },
    defaultLayout: "default-layout-1.json",
  };

  await writeFile(
    path.join(root, "dist/ui/assets/agent-pixels-assets.json"),
    JSON.stringify(index),
  );
}

await build({
  entryPoints: [path.join(root, "src/worker.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "dist/worker.js"),
  external: ["node:*"],
  plugins: [paperclipSdkAlias],
  sourcemap: true,
});

await build({
  entryPoints: [path.join(root, "src/ui/index.tsx")],
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "esm",
  outfile: path.join(root, "dist/ui/index.js"),
  jsx: "automatic",
  external: ["react", "react/jsx-runtime", "@paperclipai/plugin-sdk/ui", "@paperclipai/plugin-sdk"],
  sourcemap: true,
});

await build({
  entryPoints: [path.join(root, "src/manifest.ts")],
  bundle: false,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "dist/manifest.js"),
});

await writeAssetIndex();

console.log("Agent Pixels plugin built");
