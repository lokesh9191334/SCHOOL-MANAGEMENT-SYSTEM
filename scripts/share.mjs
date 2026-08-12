import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(root, '..')
const PORT = process.env.PORT || '5000'

function run(command, args, { name, inherit = false } = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    shell: true,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT },
  })

  if (!inherit) {
    const pipe = (buf, isErr) => {
      String(buf)
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => {
          const text = `[${name}] ${line}`
          if (isErr) console.error(text)
          else console.log(text)
        })
    }
    child.stdout?.on('data', (b) => pipe(b, false))
    child.stderr?.on('data', (b) => pipe(b, true))
  }

  return child
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function ensureBuild() {
  const distIndex = join(projectRoot, 'dist', 'index.html')
  console.log('\n[share] Building production app for friends…')
  await new Promise((resolve, reject) => {
    const build = run('npm', ['run', 'build'], { name: 'build', inherit: true })
    build.on('exit', (code) => {
      if (code === 0 && existsSync(distIndex)) resolve()
      else reject(new Error(`Build failed (code ${code})`))
    })
  })
}

async function main() {
  console.log('\n========================================')
  console.log('  SMS · Public share link for friends')
  console.log('  (No same Wi-Fi needed)')
  console.log('========================================\n')
  console.log('PC ON rakhna — jab tak dosto test karein.')
  console.log('Link band = tunnel/server band.\n')

  await ensureBuild()

  console.log(`[share] Starting API + app on port ${PORT}…`)
  const api = run('node', ['server.js'], { name: 'api' })
  await wait(1800)

  console.log('[share] Opening public Cloudflare tunnel…')
  const tunnel = run(
    'npx',
    ['--yes', 'cloudflared', 'tunnel', '--url', `http://127.0.0.1:${PORT}`],
    { name: 'tunnel' },
  )

  let publicUrl = ''
  const capture = (buf) => {
    const text = String(buf)
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
    if (match && !publicUrl) {
      publicUrl = match[0]
      console.log('\n========================================')
      console.log('  DOSTON KO YE LINK BHEJO:')
      console.log(`  ${publicUrl}`)
      console.log('========================================\n')
      console.log('Tips:')
      console.log('· Kisi bhi phone / city / Wi-Fi se open hoga')
      console.log('· Install/Add to Home Screen bhi try kar sakte hain')
      console.log('· Band karne ke liye Ctrl+C\n')
    }
  }

  tunnel.stdout?.on('data', capture)
  tunnel.stderr?.on('data', capture)

  const shutdown = () => {
    console.log('\n[share] Closing share session…')
    try {
      tunnel.kill()
    } catch {
      /* ignore */
    }
    try {
      api.kill()
    } catch {
      /* ignore */
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  tunnel.on('exit', (code) => {
    console.log(`[tunnel] exited (${code})`)
    api.kill()
    process.exit(code ?? 1)
  })
}

main().catch((err) => {
  console.error('[share] Failed:', err.message || err)
  process.exit(1)
})
