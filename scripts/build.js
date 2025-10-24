import { rm, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const distDir = join(root, 'dist');

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src);
  for (const entry of entries) {
    const sourcePath = join(src, entry);
    const destPath = join(dest, entry);
    const entryStat = await stat(sourcePath);
    if (entryStat.isDirectory()) {
      await copyDir(sourcePath, destPath);
    } else {
      await copyFile(sourcePath, destPath);
    }
  }
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await copyFile(join(root, 'index.html'), join(distDir, 'index.html'));
  await copyDir(join(root, 'src'), join(distDir, 'src'));
  console.log('Build complete: dist/ refreshed.');
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
