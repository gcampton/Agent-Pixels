import { setFloorSprites } from "../office/floorTiles.js";
import { buildDynamicCatalog } from "../office/layout/furnitureCatalog.js";
import { setCharacterTemplates } from "../office/sprites/spriteData.js";
import type { OfficeLayout, SpriteData, TileType } from "../office/types.js";
import { setWallSprites } from "../office/wallTiles.js";

type CharacterDirectionSprites = {
  down: SpriteData[];
  up: SpriteData[];
  right: SpriteData[];
};

export type AssetIndex = {
  characters: string[];
  floors: string[];
  walls: string[];
  furniture: Array<{
    id: string;
    label: string;
    category: string;
    width: number;
    height: number;
    footprintW: number;
    footprintH: number;
    isDesk: boolean;
    groupId?: string;
    orientation?: string;
    state?: string;
    rotationScheme?: string;
    animationGroup?: string;
    frame?: number;
    canPlaceOnSurfaces?: boolean;
    backgroundTiles?: number;
    canPlaceOnWalls?: boolean;
    mirrorSide?: boolean;
    furniturePath: string;
  }>;
  layouts?: {
    office: string;
    boardroomKitchen: string;
  };
  defaultLayout: string;
};

type DecodedPng = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type LoadedPixelAssets = {
  layouts: {
    office: OfficeLayout;
    boardroomKitchen: OfficeLayout;
    combined: OfficeLayout;
  };
  cameraBounds: {
    office: CameraBounds;
    boardroomKitchen: CameraBounds;
    overflowOffice: CameraBounds;
  };
};

export type CameraBounds = {
  col: number;
  row: number;
  cols: number;
  rows: number;
};

const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const CHAR_FRAMES_PER_ROW = 7;
const FLOOR_TILE_SIZE = 16;
const WALL_PIECE_WIDTH = 16;
const WALL_PIECE_HEIGHT = 32;
const WALL_GRID_COLS = 4;
const WALL_BITMASK_COUNT = 16;

let loadPromise: Promise<LoadedPixelAssets> | null = null;

function trimLayoutToVisibleRoom(layout: OfficeLayout): OfficeLayout {
  const occupied: Array<{ col: number; row: number }> = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      if (layout.tiles[row * layout.cols + col] !== 255) occupied.push({ col, row });
    }
  }

  if (occupied.length === 0) return layout;

  const minCol = Math.max(0, Math.min(...occupied.map((tile) => tile.col)) - 1);
  const maxCol = Math.min(layout.cols - 1, Math.max(...occupied.map((tile) => tile.col)) + 1);
  const minRow = Math.max(0, Math.min(...occupied.map((tile) => tile.row)) - 1);
  const maxRow = Math.min(layout.rows - 1, Math.max(...occupied.map((tile) => tile.row)) + 1);
  const cols = maxCol - minCol + 1;
  const rows = maxRow - minRow + 1;

  const tiles: TileType[] = [];
  const tileColors: OfficeLayout["tileColors"] = layout.tileColors ? [] : undefined;
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const index = row * layout.cols + col;
      tiles.push(layout.tiles[index]);
      tileColors?.push(layout.tileColors?.[index] ?? null);
    }
  }

  return {
    ...layout,
    cols,
    rows,
    tiles,
    tileColors,
    furniture: layout.furniture.map((item) => ({
      ...item,
      col: item.col - minCol,
      row: item.row - minRow,
    })),
  };
}

function combineLayouts(office: OfficeLayout, boardroomKitchen: OfficeLayout): {
  layout: OfficeLayout;
  cameraBounds: LoadedPixelAssets["cameraBounds"];
} {
  const gap = 5;
  const overflowOffice = recolorLayout(office, { h: 145, s: 16, b: -8, c: -35 }, { h: 270, s: 18, b: -20, c: -45 });
  const boardOffsetCol = office.cols + gap;
  const overflowOffsetCol = boardOffsetCol + boardroomKitchen.cols + gap;
  const cols = office.cols + gap + boardroomKitchen.cols + gap + overflowOffice.cols;
  const rows = Math.max(office.rows, boardroomKitchen.rows);
  const tiles = Array<TileType>(cols * rows).fill(255 as TileType);
  const tileColors: NonNullable<OfficeLayout["tileColors"]> = Array(cols * rows).fill(null);
  const wallColor = { h: 214, s: 30, b: -100, c: -55 };
  const hallColor = { h: 209, s: 0, b: -16, c: -8 };
  const hallFloor = 9 as TileType;
  const boardOffsetRow = Math.max(0, Math.floor((office.rows - boardroomKitchen.rows) / 2));

  function copyLayout(source: OfficeLayout, offsetCol: number, offsetRow: number) {
    for (let row = 0; row < source.rows; row++) {
      for (let col = 0; col < source.cols; col++) {
        const sourceIndex = row * source.cols + col;
        const targetIndex = (row + offsetRow) * cols + col + offsetCol;
        tiles[targetIndex] = source.tiles[sourceIndex];
        tileColors[targetIndex] = source.tileColors?.[sourceIndex] ?? null;
      }
    }
  }

  copyLayout(office, 0, 0);
  copyLayout(boardroomKitchen, boardOffsetCol, boardOffsetRow);
  copyLayout(overflowOffice, overflowOffsetCol, 0);

  const hallRow = Math.floor(rows / 2);
  const spawnTile = { col: office.cols - 1, row: hallRow };
  function drawHall(startCol: number, endCol: number) {
    for (let row = hallRow - 1; row <= hallRow + 1; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const index = row * cols + col;
        tiles[index] = hallFloor;
        tileColors[index] = hallColor;
      }
    }

    for (let row = hallRow - 2; row <= hallRow + 2; row++) {
      for (const col of [startCol + 1, startCol + 2, endCol - 1, endCol]) {
        const index = row * cols + col;
        tiles[index] = hallFloor;
        tileColors[index] = hallColor;
      }
    }
  }

  drawHall(office.cols - 2, boardOffsetCol + 1);
  drawHall(boardOffsetCol + boardroomKitchen.cols - 2, overflowOffsetCol + 1);
  tileColors[spawnTile.row * cols + spawnTile.col] = { h: 204, s: 10, b: -42, c: -32 };

  for (let row = hallRow - 2; row <= hallRow + 2; row++) {
    for (const col of [
      office.cols - 3,
      boardOffsetCol + 2,
      boardOffsetCol + boardroomKitchen.cols - 3,
      overflowOffsetCol + 2,
    ]) {
      const index = row * cols + col;
      if (tiles[index] === 255) {
        tiles[index] = 0;
        tileColors[index] = wallColor;
      }
    }
  }

  return {
    layout: {
      version: 1,
      cols,
      rows,
      layoutRevision: 1,
      tiles,
      tileColors,
      spawnTile,
      furniture: [
        ...office.furniture.map((item) => ({ ...item, uid: `camera1-${item.uid}` })),
        ...boardroomKitchen.furniture.map((item) => ({
          ...item,
          uid: `camera2-${item.uid}`,
          col: item.col + boardOffsetCol,
          row: item.row + boardOffsetRow,
        })),
        ...overflowOffice.furniture.map((item) => ({
          ...item,
          uid: `camera3-${item.uid}`,
          col: item.col + overflowOffsetCol,
        })),
      ],
    },
    cameraBounds: {
      office: { col: 0, row: 0, cols: office.cols, rows: office.rows },
      boardroomKitchen: {
        col: boardOffsetCol,
        row: boardOffsetRow - 1,
        cols: boardroomKitchen.cols,
        rows: boardroomKitchen.rows + 1,
      },
      overflowOffice: { col: overflowOffsetCol, row: 0, cols: overflowOffice.cols, rows: overflowOffice.rows },
    },
  };
}

function recolorLayout(layout: OfficeLayout, floorColor: NonNullable<OfficeLayout["tileColors"]>[number], wallColor: NonNullable<OfficeLayout["tileColors"]>[number]): OfficeLayout {
  return {
    ...layout,
    tileColors: layout.tiles.map((tile, index) => {
      if (tile === 0) return wallColor;
      if (tile === 255) return null;
      return layout.tileColors?.[index] ? floorColor : floorColor;
    }),
    furniture: layout.furniture.map((item) => {
      if (!["DESK_FRONT", "TABLE_FRONT", "SMALL_TABLE_FRONT", "SMALL_TABLE_SIDE", "COFFEE_TABLE"].includes(item.type)) {
        return item;
      }
      return {
        ...item,
        color: { h: 150, s: 18, b: -10, c: -20 },
      };
    }),
  };
}

export function getPluginAssetBaseUrl(): string {
  const metaUrl = import.meta.url;
  if (metaUrl && !metaUrl.startsWith("blob:")) {
    return new URL("./assets/", metaUrl).toString();
  }

  const pluginMatch = window.location.pathname.match(/\/_plugins\/[^/]+\/ui\//);
  if (pluginMatch) return `${pluginMatch[0]}assets/`;

  return "/_plugins/agent-pixels.camera/ui/assets/";
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < 2) return "";
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}${a === 255 ? "" : a.toString(16).padStart(2, "0")}`;
}

function pixelAt(png: DecodedPng, x: number, y: number): string {
  const idx = (y * png.width + x) * 4;
  return rgbaToHex(png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]);
}

function readSprite(png: DecodedPng, width: number, height: number, offsetX = 0, offsetY = 0): SpriteData {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => pixelAt(png, offsetX + x, offsetY + y)),
  );
}

async function decodePng(url: string): Promise<DecodedPng> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not decode PNG");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: imageData.data };
}

async function decodeCharacters(baseUrl: string, index: AssetIndex): Promise<CharacterDirectionSprites[]> {
  return Promise.all(index.characters.map(async (path) => {
    const png = await decodePng(`${baseUrl}${path}`);
    return {
      down: Array.from({ length: CHAR_FRAMES_PER_ROW }, (_, frame) =>
        readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, 0),
      ),
      up: Array.from({ length: CHAR_FRAMES_PER_ROW }, (_, frame) =>
        readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, CHAR_FRAME_H),
      ),
      right: Array.from({ length: CHAR_FRAMES_PER_ROW }, (_, frame) =>
        readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, CHAR_FRAME_H * 2),
      ),
    };
  }));
}

async function decodeFloors(baseUrl: string, index: AssetIndex): Promise<SpriteData[]> {
  return Promise.all(index.floors.map(async (path) => readSprite(await decodePng(`${baseUrl}${path}`), FLOOR_TILE_SIZE, FLOOR_TILE_SIZE)));
}

async function decodeWalls(baseUrl: string, index: AssetIndex): Promise<SpriteData[][]> {
  return Promise.all(index.walls.map(async (path) => {
    const png = await decodePng(`${baseUrl}${path}`);
    return Array.from({ length: WALL_BITMASK_COUNT }, (_, mask) =>
      readSprite(
        png,
        WALL_PIECE_WIDTH,
        WALL_PIECE_HEIGHT,
        (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH,
        Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT,
      ),
    );
  }));
}

async function decodeFurniture(baseUrl: string, index: AssetIndex): Promise<Record<string, SpriteData>> {
  const entries = await Promise.all(index.furniture.map(async (asset) => {
    const png = await decodePng(`${baseUrl}${asset.furniturePath}`);
    return [asset.id, readSprite(png, asset.width, asset.height)] as const;
  }));
  return Object.fromEntries(entries);
}

export function loadPixelAssets(): Promise<LoadedPixelAssets> {
  loadPromise ??= (async () => {
    const baseUrl = getPluginAssetBaseUrl();
    const indexUrl = `${baseUrl}agent-pixels-assets.json`;
    const index = (await fetch(indexUrl).then((res) => res.json())) as AssetIndex;

    const layoutPaths = index.layouts ?? {
      office: index.defaultLayout,
      boardroomKitchen: index.defaultLayout,
    };

    const [characters, floors, walls, furnitureSprites, officeLayout, boardroomKitchenLayout] = await Promise.all([
      decodeCharacters(baseUrl, index),
      decodeFloors(baseUrl, index),
      decodeWalls(baseUrl, index),
      decodeFurniture(baseUrl, index),
      fetch(`${baseUrl}${layoutPaths.office}`)
        .then((res) => res.json())
        .then(trimLayoutToVisibleRoom) as Promise<OfficeLayout>,
      fetch(`${baseUrl}${layoutPaths.boardroomKitchen}`)
        .then((res) => res.json())
        .then(trimLayoutToVisibleRoom) as Promise<OfficeLayout>,
    ]);

    setCharacterTemplates(characters);
    setFloorSprites(floors);
    setWallSprites(walls);
    buildDynamicCatalog({ catalog: index.furniture, sprites: furnitureSprites });

    const combined = combineLayouts(officeLayout, boardroomKitchenLayout);

    return {
      layouts: {
        office: officeLayout,
        boardroomKitchen: boardroomKitchenLayout,
        combined: combined.layout,
      },
      cameraBounds: combined.cameraBounds,
    };
  })();

  return loadPromise;
}
