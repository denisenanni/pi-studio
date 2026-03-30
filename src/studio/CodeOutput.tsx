import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

interface CodeOutputProps {
  code: string
  height: number
  collapsed: boolean
  onToggleCollapse: () => void
  onResizeStart: (e: React.MouseEvent) => void
}

// ── Syntax token types ────────────────────────────────────

type TokenType = 'kw' | 'sym' | 'num' | 'plain'

interface Token {
  type: TokenType
  text: string
}

// Simple line-by-line tokeniser for the static placeholder snippet
function tokeniseLine(line: string): Token[] {
  const tokens: Token[] = []
  let remaining = line

  // Keywords (order matters — longer first)
  const keywords = ['use_bpm', 'live_loop', 'with_fx', 'sample', 'synth', 'sleep', 'do', 'end']
  // Symbols start with : followed by word chars
  const symRe = /^:[a-z_][a-z0-9_]*/
  // Numbers
  const numRe = /^\d+(\.\d+)?/
  // Identifiers / plain
  const wordRe = /^[a-z_][a-z0-9_]*/
  // Punctuation / spaces
  const restRe = /^[^a-z0-9_:]+/i

  while (remaining.length > 0) {
    // Try keyword
    const kwMatch = keywords.find((kw) => remaining.startsWith(kw) && !/[a-z0-9_]/.test(remaining[kw.length] ?? ''))
    if (kwMatch) {
      tokens.push({ type: 'kw', text: kwMatch })
      remaining = remaining.slice(kwMatch.length)
      continue
    }
    // Symbol
    const symMatch = symRe.exec(remaining)
    if (symMatch) {
      tokens.push({ type: 'sym', text: symMatch[0] })
      remaining = remaining.slice(symMatch[0].length)
      continue
    }
    // Number
    const numMatch = numRe.exec(remaining)
    if (numMatch) {
      tokens.push({ type: 'num', text: numMatch[0] })
      remaining = remaining.slice(numMatch[0].length)
      continue
    }
    // Plain word
    const wordMatch = wordRe.exec(remaining)
    if (wordMatch) {
      tokens.push({ type: 'plain', text: wordMatch[0] })
      remaining = remaining.slice(wordMatch[0].length)
      continue
    }
    // Rest (spaces, punctuation)
    const restMatch = restRe.exec(remaining)
    if (restMatch) {
      tokens.push({ type: 'plain', text: restMatch[0] })
      remaining = remaining.slice(restMatch[0].length)
      continue
    }
    // Fallback — consume one char
    tokens.push({ type: 'plain', text: remaining[0] })
    remaining = remaining.slice(1)
  }

  return tokens
}

export function CodeOutput({ code, height, collapsed, onToggleCollapse, onResizeStart }: CodeOutputProps) {
  const tokenisedLines = useMemo(() => code.split('\n').map(tokeniseLine), [code])
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current) }
  }, [])

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200)
    })
  }, [code])

  return (
    <div className="studio-code-panel" style={{ height: collapsed ? 36 : height }}>
      {/* Drag handle */}
      {!collapsed && (
        <div className="studio-code-resize-handle" onMouseDown={onResizeStart}>
          <span className="studio-code-resize-dots">···</span>
        </div>
      )}

      {/* Header */}
      <div className="studio-code-header">
        <span className="studio-code-header-label">CODE OUTPUT</span>
        <button className="studio-code-copy" onClick={handleCopy}>
          {copied ? 'copied!' : 'copy'}
        </button>
        <button
          className="studio-code-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand code panel' : 'Collapse code panel'}
        >
          {collapsed ? '∧' : '∨'}
        </button>
      </div>

      {/* Code */}
      {!collapsed && (
        <div className="studio-code-body">
          <pre className="studio-code-pre">
            {tokenisedLines.map((tokens, lineIdx) => (
              <div key={lineIdx}>
                {tokens.map((tok, tokIdx) => (
                  <span key={tokIdx} className={`tok-${tok.type}`}>{tok.text}</span>
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}
