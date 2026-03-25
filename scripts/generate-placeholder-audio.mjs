/**
 * Writes minimal valid silent WAV files so Metro can bundle assets/audio/*.wav.
 * Replace with real ambient loops before shipping.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'audio');

function writeSilentWav(filePath, durationSec = 0.3) {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filePath, buf);
}

fs.mkdirSync(dir, { recursive: true });
for (const name of ['forest', 'rain', 'waves', 'fire', 'wind']) {
  writeSilentWav(path.join(dir, `${name}.wav`));
}
console.log('Wrote placeholder WAVs to', dir);
