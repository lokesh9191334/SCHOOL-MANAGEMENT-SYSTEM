import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const children = [
  { name: 'API server', args: [join(root, 'server.js')] },
  { name: 'Vite frontend', args: [viteCli, '--host'] },
].map(({ name, args }) => ({
  name,
  process: spawn(process.execPath, args, { cwd: root, stdio: 'inherit' }),
}))

let stopping = false

function stop(exitCode) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.process.exitCode === null) child.process.kill()
  }
  process.exitCode = exitCode
}

for (const child of children) {
  child.process.once('error', (error) => {
    console.error(`${child.name} could not start:`, error.message)
    stop(1)
  })
  child.process.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${child.name} stopped (${signal || `exit code ${code}`}).`)
      stop(code || 1)
    }
  })
}

process.once('SIGINT', () => stop(0))
process.once('SIGTERM', () => stop(0))
