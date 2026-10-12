/* Copies the face-api model files used by Staff Face Attendance from the
   installed package into public/models (kept out of git; re-created on
   prebuild/predev). Run manually with: node scripts/copy-face-models.mjs */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(projectRoot, 'node_modules', '@vladmandic', 'face-api', 'model')
const targetDir = join(projectRoot, 'public', 'models')

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
]

if (!existsSync(sourceDir)) {
  console.error('face-api package not found. Run "npm install" first.')
  process.exit(1)
}

mkdirSync(targetDir, { recursive: true })

let copied = 0
for (const file of FILES) {
  const from = join(sourceDir, file)
  const to = join(targetDir, file)
  if (!existsSync(from)) {
    console.error(`Missing model file in package: ${file}`)
    process.exit(1)
  }
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue
  copyFileSync(from, to)
  copied += 1
}

console.log(
  copied > 0
    ? `Face models ready in public/models (${copied} file${copied === 1 ? '' : 's'} copied).`
    : 'Face models already up to date in public/models.',
)
