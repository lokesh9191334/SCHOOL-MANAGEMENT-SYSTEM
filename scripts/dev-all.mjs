import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(root, '..')

function run(command, args, name, color) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  const prefix = (line) => `[${name}] ${line}`

  child.stdout.on('data', (buf) => {
    String(buf)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => console.log(prefix(line)))
  })
  child.stderr.on('data', (buf) => {
    String(buf)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => console.error(prefix(line)))
  })

  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`)
    process.exit(code ?? 1)
  })

  return child
}

console.log('Starting SMS API (:5000) + Vite (:5173)...')
const api = run('node', ['server.js'], 'api', 'cyan')
const web = run('npm', ['run', 'dev', '--', '--host'], 'web', 'green')

function shutdown() {
  api.kill()
  web.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
