import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Dev-only plugin: exposes POST /api/save-preset
// Writes to colorData.js, commits, and pushes — only active during `npm run dev`
function savePresetPlugin() {
  return {
    name: 'save-preset',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/save-preset' || req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
          try {
            const { name, color, step } = JSON.parse(body)

            if (!name || !/^#[0-9a-fA-F]{6}$/i.test(color)) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Invalid data' }))
            }

            const filePath = resolve('./src/colorData.js')
            let src = readFileSync(filePath, 'utf-8')

            // Insert before the closing ]; of the PRESETS array
            const entry = `  { name:"${name}", color:"${color}", step:"${step ?? '50'}" },`
            src = src.replace(
              /(export const PRESETS = \[[\s\S]*?)(];)/,
              (_, arr, close) => `${arr}${entry}\n${close}`
            )

            writeFileSync(filePath, src)

            // Commit and push
            const cwd = resolve('./')
            execSync('git add src/colorData.js', { cwd })
            execSync(`git commit -m "preset: add ${name} (${color})"`, { cwd })
            execSync('git push', { cwd })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), savePresetPlugin()],
  // VITE_BASE_URL is set by GitHub Actions to /repo-name/
  // Falls back to / for local dev
  base: process.env.VITE_BASE_URL || '/',
})
