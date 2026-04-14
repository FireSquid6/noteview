'use client'

import { useState, useRef } from 'react'

export default function Home() {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [outputName, setOutputName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(f: File) {
    setFile(f)
    setOutputName(f.name.replace(/\.md$/i, ''))
    setError(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }

  async function convert() {
    setError(null)

    let markdown: string
    if (tab === 'upload') {
      if (!file) {
        setError('Please select a file.')
        return
      }
      markdown = await file.text()
    } else {
      if (!pasteText.trim()) {
        setError('Please paste some markdown.')
        return
      }
      markdown = pasteText
    }

    const title = outputName.trim() || 'document'

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('markdown', markdown)
      formData.append('title', title)

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error: ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1 className="header-title">Noteview</h1>
        <p className="header-subtitle">Render markdown to PDF</p>
      </header>

      <main className="main">
        <div className="card">
          <div className="tabs">
            <button
              className={`tab${tab === 'upload' ? ' tab--active' : ''}`}
              onClick={() => setTab('upload')}
            >
              Upload file
            </button>
            <button
              className={`tab${tab === 'paste' ? ' tab--active' : ''}`}
              onClick={() => setTab('paste')}
            >
              Paste markdown
            </button>
          </div>

          {tab === 'upload' ? (
            <div
              className={`drop-zone${dragging ? ' drop-zone--dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown"
                className="file-input"
                onChange={onFileChange}
              />
              {file ? (
                <span className="drop-zone-filename">{file.name}</span>
              ) : (
                <span className="drop-zone-hint">
                  Drop a <code>.md</code> file here or click to browse
                </span>
              )}
            </div>
          ) : (
            <textarea
              className="paste-area"
              placeholder="# Your markdown here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          )}

          <div className="filename-row">
            <label className="filename-label" htmlFor="output-name">
              Output filename
            </label>
            <div className="filename-input-wrapper">
              <input
                id="output-name"
                type="text"
                className="filename-input"
                placeholder="document"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
              />
              <span className="filename-ext">.pdf</span>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className="convert-btn"
            onClick={convert}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              'Convert to PDF'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
