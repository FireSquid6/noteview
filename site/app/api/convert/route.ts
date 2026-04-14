import { NextRequest } from 'next/server'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Katex from 'katex'
import hljs from 'highlight.js'
// @ts-expect-error no types
import extendedLatex from 'marked-extended-latex'
import markedMermaid from '@maddyguthridge/marked-mermaid'
import fm from 'front-matter'
import puppeteer from 'puppeteer'

const SITE_ROOT = resolve(process.cwd())

function setupMarked() {
  const m = new Marked()

  m.use(extendedLatex({
    render: (formula: string, displayMode: boolean) => {
      return Katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
      })
    },
  }))

  m.use(markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }))

  m.use(markedMermaid())

  return m
}

async function renderHtml(markdown: string): Promise<string> {
  const { body } = fm(markdown)
  const instance = setupMarked()
  const html = await instance.parse(body as string)
  return html
}

function buildHtmlPage(contentHtml: string, title: string): string {
  const highlightCss = readFileSync(
    resolve(SITE_ROOT, 'node_modules/highlight.js/styles/tokyo-night-dark.css'),
    'utf-8'
  )
  const katexCss = readFileSync(
    resolve(SITE_ROOT, 'node_modules/katex/dist/katex.min.css'),
    'utf-8'
  )
  const mainCss = readFileSync(
    resolve(SITE_ROOT, '..', 'static/main.text.css'),
    'utf-8'
  )

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${highlightCss}</style>
  <style>${katexCss}</style>
  <style>${mainCss}</style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  </script>
</head>
<body>
  <div class="app-layout">
    <div class="main-layout">
      <div class="content-wrapper">
        <main class="content">
          ${contentHtml}
        </main>
      </div>
    </div>
  </div>
  <script>
    (async () => { await mermaid.run(); })();
  </script>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    let markdown: string
    let title = 'document'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const mdField = formData.get('markdown')
      if (!mdField || typeof mdField !== 'string') {
        return new Response('Missing markdown field', { status: 400 })
      }
      markdown = mdField
      const titleField = formData.get('title')
      if (titleField && typeof titleField === 'string') {
        title = titleField.replace(/\.pdf$/i, '')
      }
    } else {
      const body = await request.json()
      markdown = body.markdown
      if (!markdown) {
        return new Response('Missing markdown field', { status: 400 })
      }
      if (body.title) {
        title = (body.title as string).replace(/\.pdf$/i, '')
      }
    }

    const contentHtml = await renderHtml(markdown)
    const html = buildHtmlPage(contentHtml, title)

    const tempFile = join(tmpdir(), `noteview-${Date.now()}.html`)
    writeFileSync(tempFile, html, 'utf-8')

    const browser = await puppeteer.launch({ headless: true })
    let pdfBuffer: Uint8Array
    try {
      const page = await browser.newPage()
      await page.goto(`file://${tempFile}`, { waitUntil: 'networkidle2' })

      await page
        .waitForFunction(
          () => document.querySelectorAll('.mermaid:not([data-processed])').length === 0,
          { timeout: 15000 }
        )
        .catch(() => {})

      const raw = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      })
      pdfBuffer = new Uint8Array(raw.buffer as ArrayBuffer)
    } finally {
      await browser.close()
      try { unlinkSync(tempFile) } catch {}
    }

    const filename = `${title}.pdf`
    return new Response(new Blob([pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF conversion error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
