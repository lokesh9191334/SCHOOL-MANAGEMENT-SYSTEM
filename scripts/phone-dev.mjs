import { spawn } from 'child_process'
import { networkInterfaces } from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(root, '..')

function lanIps() {
  const nets = networkInterfaces()
  const ips = []
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address)
    }
  }
  return ips
}

function run(command, args, name) {
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

const ips = lanIps()
console.log('\n=== SMS Phone Access ===')
console.log('1) PC aur phone SAME Wi-Fi pe hona chahiye')
console.log('2) Phone browser mein ye URL kholo:\n')
ips.forEach((ip) => {
  console.log(`   http://${ip}:5173`)
})
if (!ips.length) console.log('   (LAN IP nahi mila — Wi-Fi check karo)')
console.log('\nAPI + Vite start ho rahe hain...\n')

const api = run('node', ['server.js'], 'api')
const web = run('npx', ['vite', '--host', '--port', '5173', '--strictPort'], 'web')

function shutdown() {
  api.kill()
  web.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
