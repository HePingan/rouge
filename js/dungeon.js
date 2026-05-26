// BSP (Binary Space Partitioning) Dungeon Generator
// Generates a grid-based dungeon with rooms connected by corridors

const TILE = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
  STAIRS_DOWN: 3,
};

const ROOM_TYPE = {
  START: 'start',
  NORMAL: 'normal',
  TREASURE: 'treasure',
  ELITE: 'elite',
  BOSS: 'boss',
};

const DUNGEON_WIDTH = 52;
const DUNGEON_HEIGHT = 36;
const MIN_ROOM_SIZE = 5;
const MAX_ROOM_SIZE = 12;
const MIN_LEAF_SIZE = 10;
const MAX_DEPTH = 3;

const BIOMES = [
  {
    id: 'snow', name: '雪原', icon: '❄️', floorRange: [1, 3],
    bg: '#203647', wall: '#1f3547', wall2: '#172b3b', floor: '#6f9eb9', floor2: '#668faf',
    border: 'rgba(220,245,255,0.11)', speck: 'rgba(235,250,255,0.30)', stairs: '#8ed8ff',
    monsterMult: { hp: 1.12, atk: 0.92, def: 1.15, xp: 1.05, stones: 1.00 },
    monsters: [
      { name: '雪狼', symbol: '狼', hp: 30, atk: 9, def: 2, xp: 14, stones: 3, color: '#29485d', weight: 34, skillIds: ['frostBite'] },
      { name: '冰魄', symbol: '冰', hp: 28, atk: 8, def: 4, xp: 17, stones: 4, color: '#2d637c', weight: 28, skillIds: ['frostBite', 'ironShell'] },
      { name: '霜甲兽', symbol: '甲', hp: 46, atk: 7, def: 7, xp: 21, stones: 5, color: '#3f5f72', weight: 22, skillIds: ['ironShell'] },
      { name: '寒鸦妖', symbol: '鸦', hp: 24, atk: 13, def: 1, xp: 20, stones: 5, color: '#263244', weight: 16, skillIds: ['shadowBackstab'] },
    ],
  },
  {
    id: 'jungle', name: '丛林', icon: '🌿', floorRange: [4, 7],
    bg: '#16351d', wall: '#315b32', wall2: '#234626', floor: '#3f7340', floor2: '#4f8f45',
    border: 'rgba(120,210,110,0.32)', speck: 'rgba(190,255,120,0.55)', stairs: '#b6e36b',
    monsterMult: { hp: 1.00, atk: 1.08, def: 0.95, xp: 1.08, stones: 1.05 },
    monsters: [
      { name: '藤妖', symbol: '藤', hp: 36, atk: 8, def: 3, xp: 18, stones: 4, color: '#66bb55', weight: 32, skillIds: ['thornBind'] },
      { name: '毒蟒', symbol: '蟒', hp: 34, atk: 13, def: 2, xp: 22, stones: 5, color: '#44aa66', weight: 28, skillIds: ['venomFang'] },
      { name: '树精', symbol: '树', hp: 54, atk: 9, def: 7, xp: 25, stones: 6, color: '#8bb35a', weight: 22, skillIds: ['thornBind', 'ironShell'] },
      { name: '花魅', symbol: '魅', hp: 28, atk: 15, def: 1, xp: 26, stones: 7, color: '#ff77cc', weight: 18, skillIds: ['soulDrain'] },
    ],
  },
  {
    id: 'lava', name: '熔岩', icon: '🌋', floorRange: [8, 999],
    bg: '#35120b', wall: '#62210f', wall2: '#3d1208', floor: '#7a2f17', floor2: '#9d3b16',
    border: 'rgba(255,120,40,0.38)', speck: 'rgba(255,190,70,0.6)', stairs: '#ffdd55',
    monsterMult: { hp: 1.10, atk: 1.22, def: 1.00, xp: 1.18, stones: 1.15 },
    monsters: [
      { name: '岩浆蜥', symbol: '蜥', hp: 46, atk: 15, def: 3, xp: 26, stones: 6, color: '#ff6644', weight: 34, skillIds: ['flameSpit'] },
      { name: '炎魔', symbol: '炎', hp: 52, atk: 17, def: 4, xp: 30, stones: 8, color: '#ff3311', weight: 26, skillIds: ['lavaBurst'] },
      { name: '火灵', symbol: '火', hp: 32, atk: 20, def: 1, xp: 29, stones: 8, color: '#ffaa33', weight: 22, skillIds: ['flameSpit', 'shadowBackstab'] },
      { name: '熔甲兽', symbol: '熔', hp: 70, atk: 13, def: 8, xp: 34, stones: 10, color: '#cc4422', weight: 18, skillIds: ['lavaBurst', 'ironShell'] },
    ],
  },
];

function getBiomeForLevel(level = 1) {
  return BIOMES.find(b => level >= b.floorRange[0] && level <= b.floorRange[1]) || BIOMES[0];
}


class Leaf {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null;
  }

  split() {
    if (this.left || this.right) return false;
    // Decide split direction
    let splitH = Math.random() > 0.5;
    if (this.w > this.h && this.w / this.h >= 1.25) splitH = false;
    else if (this.h > this.w && this.h / this.w >= 1.25) splitH = true;

    const maxSize = (splitH ? this.h : this.w) - MIN_LEAF_SIZE;
    if (maxSize < MIN_LEAF_SIZE) return false;

    const splitPos = MIN_LEAF_SIZE + Math.floor(Math.random() * (maxSize - MIN_LEAF_SIZE + 1));

    if (splitH) {
      this.left = new Leaf(this.x, this.y, this.w, splitPos);
      this.right = new Leaf(this.x, this.y + splitPos, this.w, this.h - splitPos);
    } else {
      this.left = new Leaf(this.x, this.y, splitPos, this.h);
      this.right = new Leaf(this.x + splitPos, this.y, this.w - splitPos, this.h);
    }
    return true;
  }

  createRooms() {
    if (this.left || this.right) {
      if (this.left) this.left.createRooms();
      if (this.right) this.right.createRooms();
      return;
    }
    // Leaf node — create a room
    const roomW = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.min(MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1, this.w - 3));
    const roomH = MIN_ROOM_SIZE + Math.floor(Math.random() * Math.min(MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1, this.h - 3));
    const roomX = this.x + 1 + Math.floor(Math.random() * (this.w - roomW - 2));
    const roomY = this.y + 1 + Math.floor(Math.random() * (this.h - roomH - 2));
    this.room = { x: roomX, y: roomY, w: roomW, h: roomH };
  }

  getRoom() {
    if (this.room) return this.room;
    const rooms = [];
    if (this.left) {
      const r = this.left.getRoom();
      if (r) rooms.push(r);
    }
    if (this.right) {
      const r = this.right.getRoom();
      if (r) rooms.push(r);
    }
    return rooms.length > 0 ? rooms : null;
  }

  getAllRooms() {
    const result = [];
    this._collectRooms(result);
    return result;
  }

  _collectRooms(arr) {
    if (this.room) { arr.push(this.room); return; }
    if (this.left) this.left._collectRooms(arr);
    if (this.right) this.right._collectRooms(arr);
  }
}

function generateDungeon(width = DUNGEON_WIDTH, height = DUNGEON_HEIGHT, depth = MAX_DEPTH, level = 1) {
  // Initialize grid with walls
  const grid = Array.from({ length: height }, () => Array(width).fill(TILE.WALL));

  // Create root leaf
  const root = new Leaf(1, 1, width - 2, height - 2);

  // Recursively split
  const leaves = [root];
  let didSplit = true;
  for (let i = 0; i < depth; i++) {
    didSplit = false;
    const newLeaves = [];
    for (const leaf of leaves) {
      if (leaf.left || leaf.right) {
        if (leaf.left) newLeaves.push(leaf.left);
        if (leaf.right) newLeaves.push(leaf.right);
      } else if (leaf.split()) {
        didSplit = true;
        if (leaf.left) newLeaves.push(leaf.left);
        if (leaf.right) newLeaves.push(leaf.right);
      } else {
        newLeaves.push(leaf);
      }
    }
    leaves.length = 0;
    leaves.push(...newLeaves);
    if (!didSplit) break;
  }

  // Create rooms in leaf nodes
  root.createRooms();
  const rooms = root.getAllRooms();
  if (rooms.length < 4) {
    // Fallback: ensure minimum rooms
    return generateDungeon(width, height, depth + 1, level);
  }

  // Carve rooms into grid
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) {
          grid[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);

    // L-shaped corridor
    if (Math.random() > 0.5) {
      carveCorridorH(grid, ax, bx, ay);
      carveCorridorV(grid, ay, by, bx);
    } else {
      carveCorridorV(grid, ay, by, ax);
      carveCorridorH(grid, ax, bx, by);
    }
  }

  const roomMeta = rooms.map((room, idx) => ({
    ...room,
    index: idx,
    type: idx === 0 ? ROOM_TYPE.START : ROOM_TYPE.NORMAL,
    cx: Math.floor(room.x + room.w / 2),
    cy: Math.floor(room.y + room.h / 2),
  }));

  if (roomMeta.length > 1) {
    roomMeta[roomMeta.length - 1].type = ROOM_TYPE.BOSS;
    const candidates = roomMeta.slice(1, -1).sort((a, b) => (b.w * b.h) - (a.w * a.h));
    if (candidates[0]) candidates[0].type = ROOM_TYPE.TREASURE;
    if (candidates[1]) candidates[1].type = ROOM_TYPE.ELITE;
  }

  const roomTypeByCell = new Map();
  for (const room of roomMeta) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        roomTypeByCell.set(`${x},${y}`, room.type);
      }
    }
  }

  // Place stairs down in a random room (not the spawn room)
  if (rooms.length > 1) {
    const stairRoom = rooms[rooms.length - 1];
    const sx = Math.floor(stairRoom.x + stairRoom.w / 2);
    const sy = Math.floor(stairRoom.y + stairRoom.h / 2);
    if (sy < height && sx < width) grid[sy][sx] = TILE.STAIRS_DOWN;
  }

  return {
    grid,
    width,
    height,
    rooms: roomMeta,
    roomTypeByCell,
    spawnRoom: roomMeta[0],
    biome: getBiomeForLevel(level),
  };
}

function carveCorridorH(grid, x1, x2, y) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x] === TILE.WALL) grid[y][x] = TILE.FLOOR;
    }
  }
}

function carveCorridorV(grid, y1, y2, x) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x] === TILE.WALL) grid[y][x] = TILE.FLOOR;
    }
  }
}
