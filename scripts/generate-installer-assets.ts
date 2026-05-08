import fs from "node:fs";
import path from "node:path";

type Color = [number, number, number];

const buildDir = path.resolve("build");
fs.mkdirSync(buildDir, { recursive: true });

function writeBmp(filePath: string, width: number, height: number, draw: (set: (x: number, y: number, color: Color) => void) => void) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const buffer = Buffer.alloc(54 + pixelSize);

  buffer.write("BM", 0);
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelSize, 34);

  const set = (x: number, y: number, [r, g, b]: Color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const row = height - 1 - y;
    const offset = 54 + row * rowSize + x * 3;
    buffer[offset] = b;
    buffer[offset + 1] = g;
    buffer[offset + 2] = r;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      set(x, y, [246, 242, 234]);
    }
  }
  draw(set);
  fs.writeFileSync(filePath, buffer);
}

function rect(set: (x: number, y: number, color: Color) => void, x: number, y: number, w: number, h: number, color: Color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      set(px, py, color);
    }
  }
}

function line(set: (x: number, y: number, color: Color) => void, x1: number, y1: number, x2: number, y2: number, color: Color, thickness = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x1 + ((x2 - x1) * i) / steps);
    const y = Math.round(y1 + ((y2 - y1) * i) / steps);
    rect(set, x - Math.floor(thickness / 2), y - Math.floor(thickness / 2), thickness, thickness, color);
  }
}

function drawVN(set: (x: number, y: number, color: Color) => void, x: number, y: number, scale: number, color: Color) {
  line(set, x, y, x + 12 * scale, y + 34 * scale, color, 3 * scale);
  line(set, x + 24 * scale, y, x + 12 * scale, y + 34 * scale, color, 3 * scale);
  line(set, x + 34 * scale, y + 34 * scale, x + 34 * scale, y, color, 3 * scale);
  line(set, x + 34 * scale, y, x + 58 * scale, y + 34 * scale, color, 3 * scale);
  line(set, x + 58 * scale, y + 34 * scale, x + 58 * scale, y, color, 3 * scale);
}

writeBmp(path.join(buildDir, "installerSidebar.bmp"), 164, 314, (set) => {
  rect(set, 0, 0, 164, 314, [32, 32, 29]);
  rect(set, 0, 0, 164, 8, [46, 111, 87]);
  rect(set, 0, 306, 164, 8, [189, 122, 34]);
  rect(set, 22, 34, 120, 120, [255, 250, 240]);
  drawVN(set, 38, 72, 2, [32, 32, 29]);
  rect(set, 22, 184, 120, 3, [216, 207, 189]);
  rect(set, 22, 204, 86, 7, [255, 250, 240]);
  rect(set, 22, 222, 108, 5, [115, 109, 97]);
  rect(set, 22, 236, 94, 5, [115, 109, 97]);
});

writeBmp(path.join(buildDir, "installerHeader.bmp"), 150, 57, (set) => {
  rect(set, 0, 0, 150, 57, [255, 250, 240]);
  rect(set, 0, 0, 150, 5, [46, 111, 87]);
  rect(set, 12, 13, 36, 31, [32, 32, 29]);
  drawVN(set, 17, 18, 1, [255, 250, 240]);
  rect(set, 58, 18, 74, 6, [32, 32, 29]);
  rect(set, 58, 31, 54, 4, [115, 109, 97]);
});

console.log("Installer assets generated in build/.");
