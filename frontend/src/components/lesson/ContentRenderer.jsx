import React, { useState, useEffect } from 'react';
import JupyterLiteExercise from '../course/JupyterLiteExercise';
import { runPythonCode } from '../../utils/pyodideRunner';

function CodeBlock({ code: initialCode = '', language = 'python' }) {
  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCode(initialCode || '');
    setOutput(null);
    setError(null);
    setIsEditing(false);
  }, [initialCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPython = !language || language.toLowerCase() === 'python' || language.toLowerCase() === 'py';

  const handleRun = async () => {
    if (!isPython || isRunning) return;
    setIsRunning(true);
    setError(null);
    setOutput(null);

    try {
      const res = await runPythonCode(code);
      if (res.success) {
        setOutput(res.output || '(Code executed successfully with no printed output)');
        setError(null);
      } else {
        setOutput(null);
        setError(res.error || 'Execution failed');
      }
    } catch (err) {
      setOutput(null);
      setError(err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(initialCode || '');
    setOutput(null);
    setError(null);
    setIsEditing(false);
  };

  const isModified = code !== initialCode;

  return (
    <div className="content-code-block">
      <div className="code-header">
        <div className="code-header-left">
          <span className="code-lang">{(language || 'PYTHON').toUpperCase()}</span>
          {isPython && (
            <span className="code-interactive-tag" title="Can be executed directly in your browser">
              ⚡ LIVE DEMO
            </span>
          )}
        </div>
        <div className="code-header-actions">
          {isPython && (
            <button
              type="button"
              className={`code-run-btn ${isRunning ? 'running' : ''}`}
              onClick={handleRun}
              disabled={isRunning}
              title="Execute this example live in your browser"
            >
              {isRunning ? (
                <>
                  <span className="live-spinner-icon" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <span className="play-triangle">▶</span>
                  <span>Run Live</span>
                </>
              )}
            </button>
          )}

          {isPython && (
            <button
              type="button"
              className={`code-action-btn ${isEditing ? 'active' : ''}`}
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Switch to code view' : 'Tweak and test this code live'}
            >
              {isEditing ? '👁 View Code' : '✏ Edit'}
            </button>
          )}

          {isModified && (
            <button
              type="button"
              className="code-action-btn code-reset-btn"
              onClick={handleReset}
              title="Reset code back to original example"
            >
              ↺ Reset
            </button>
          )}

          <button
            type="button"
            className="code-copy-btn"
            onClick={handleCopy}
            aria-label="Copy code to clipboard"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="code-editor-container">
          <textarea
            className="code-editor-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            rows={Math.max(4, code.split('\n').length + 1)}
            aria-label="Interactive Python code editor"
          />
        </div>
      ) : (
        <pre className="code-pre">
          <code>{code}</code>
        </pre>
      )}

      {/* Live Output Console directly below code */}
      {(output !== null || error !== null || isRunning) && (
        <div className="code-live-terminal">
          <div className="live-terminal-bar">
            <div className="live-terminal-dots">
              <span className="terminal-dot dot-red" />
              <span className="terminal-dot dot-yellow" />
              <span className="terminal-dot dot-green" />
            </div>
            <span className="live-terminal-label">
              {isRunning ? 'EXECUTING IN PYODIDE RUNTIME...' : 'LIVE EXECUTION OUTPUT'}
            </span>
            <button
              type="button"
              className="live-terminal-dismiss"
              onClick={() => { setOutput(null); setError(null); }}
              title="Close output"
            >
              ✕ Clear
            </button>
          </div>
          <div className="live-terminal-viewport">
            {isRunning ? (
              <div className="live-terminal-loading">
                <span className="live-spinner-icon big" />
                <span>Running Python code live in browser WebAssembly...</span>
              </div>
            ) : error ? (
              <pre className="live-terminal-err-content">{error}</pre>
            ) : (
              <pre className="live-terminal-out-content">{output}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentRenderer({ content = [] }) {
  if (!Array.isArray(content) || content.length === 0) {
    return <p className="lesson-empty">No content available for this lesson.</p>;
  }

  return (
    <div className="content-renderer">
      {content.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 3) {
              return (
                <h3 key={idx} className="lesson-h3">
                  {block.text}
                </h3>
              );
            }
            return (
              <h2 key={idx} className="lesson-h2">
                {block.text}
              </h2>
            );
          }

          case 'paragraph': {
            return (
              <p key={idx} className="lesson-paragraph">
                {block.text}
              </p>
            );
          }

          case 'list': {
            return (
              <ul key={idx} className="lesson-list">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            );
          }

          case 'code': {
            return <CodeBlock key={idx} code={block.code} language={block.language || 'python'} />;
          }

          case 'output': {
            return (
              <div key={idx} className="content-output-block">
                <div className="output-header">
                  <span className="output-dot red" />
                  <span className="output-dot yellow" />
                  <span className="output-dot green" />
                  <span className="output-label">OUTPUT</span>
                </div>
                <pre className="output-pre">
                  <code>{block.text || block.output}</code>
                </pre>
              </div>
            );
          }

          case 'equation': {
            return (
              <div key={idx} className="content-equation-card" style={{ background: '#0b1329', border: '1px solid #1e3a8a', borderRadius: '8px', padding: '1.25rem', margin: '1.5rem 0', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#60a5fa', textTransform: 'uppercase' }}>
                    📐 {block.title || 'Theoretical Formulation'}
                  </span>
                  {block.label && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>({block.label})</span>
                  )}
                </div>
                <div style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif', fontSize: '1.2rem', textAlign: 'center', padding: '0.85rem 0', color: '#f8fafc', letterSpacing: '0.02em', overflowX: 'auto' }}>
                  {block.formula || block.code || block.text}
                </div>
                {block.explanation && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                    {block.explanation}
                  </p>
                )}
              </div>
            );
          }

          case 'definition': {
            return (
              <div key={idx} className="content-definition-card" style={{ background: '#0d1d36', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', padding: '1.1rem 1.4rem', margin: '1.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>📖 FORMAL DEFINITION</span>
                </div>
                <h4 style={{ margin: '0 0 0.4rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>
                  {block.title || block.term || 'Concept Definition'}
                </h4>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.925rem' }}>
                  {block.text || block.definition}
                </p>
              </div>
            );
          }

          case 'derivation': {
            return (
              <div key={idx} className="content-derivation-card" style={{ background: '#0a101f', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem', margin: '1.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ background: '#1e293b', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                    ∫ DERIVATION & PROOF
                  </span>
                  <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>{block.title || 'Mathematical Derivation'}</h4>
                </div>
                {block.steps && Array.isArray(block.steps) ? (
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.7' }}>
                    {block.steps.map((st, sIdx) => (
                      <li key={sIdx} style={{ marginBottom: '0.5rem' }}>{st}</li>
                    ))}
                  </ol>
                ) : (
                  <div style={{ color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontFamily: 'monospace' }}>
                    {block.text}
                  </div>
                )}
              </div>
            );
          }

          case 'example': {
            return (
              <div key={idx} className="content-example-card" style={{ background: '#0d1e1f', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0', padding: '1.1rem 1.4rem', margin: '1.5rem 0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  💡 EMPIRICAL EXAMPLE & APPLICATION
                </div>
                {block.title && <h4 style={{ margin: '0 0 0.4rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>{block.title}</h4>}
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.925rem' }}>{block.text}</p>
              </div>
            );
          }

          case 'summary': {
            return (
              <div key={idx} className="content-summary-card" style={{ background: '#191724', border: '1px solid #7c3aed', borderRadius: '8px', padding: '1.25rem', margin: '1.5rem 0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  🎯 CORE TAKEAWAYS & LESSON SUMMARY
                </div>
                {block.title && <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.05rem' }}>{block.title}</h4>}
                {block.items && Array.isArray(block.items) ? (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.7' }}>
                    {block.items.map((it, itIdx) => <li key={itIdx}>{it}</li>)}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.925rem' }}>{block.text}</p>
                )}
              </div>
            );
          }

          case 'image': {
            return (
              <figure key={idx} style={{ margin: '1.5rem 0', textAlign: 'center' }}>
                <img
                  src={block.url}
                  alt={block.title || 'Course illustration'}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                {(block.title || block.caption) && (
                  <figcaption style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    {block.title || block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'video': {
            return (
              <div key={idx} style={{ margin: '1.5rem 0' }}>
                {block.title && <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1rem' }}>{block.title}</h4>}
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <iframe
                    src={block.url}
                    title={block.title || 'Lecture video'}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          }

          case 'note': {
            return (
              <div key={idx} className="content-note-card">
                <div className="note-badge">KEY CONCEPT</div>
                {block.title && <h4 className="note-title">{block.title}</h4>}
                <p className="note-text">{block.text}</p>
              </div>
            );
          }

          case 'warning': {
            return (
              <div key={idx} className="content-warning-card">
                <div className="warning-badge">⚠️ SYNTAX ERROR NOTICE</div>
                {block.title && <h4 className="warning-title">{block.title}</h4>}
                <p className="warning-text">{block.text}</p>
              </div>
            );
          }

          case 'cards': {
            return (
              <div key={idx} className="content-cards-section">
                {block.title && <h3 className="cards-section-title">{block.title}</h3>}
                <div className="content-cards-grid">
                  {block.cards?.map((card, cardIdx) => (
                    <div key={cardIdx} className="content-card-item">
                      <div className="card-item-top">
                        <h4 className="card-item-title">{card.title}</h4>
                        {card.tag && <span className="card-item-tag">{card.tag}</span>}
                      </div>
                      <p className="card-item-desc">{card.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          case 'link': {
            return (
              <div key={idx} className="content-resource-link">
                <div className="resource-icon" aria-hidden="true">🔗</div>
                <div className="resource-body">
                  <h4 className="resource-title">{block.title}</h4>
                  {block.text && <p className="resource-text">{block.text}</p>}
                  <a
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-btn"
                  >
                    <span>Open External Resource</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            );
          }

          case 'table': {
            return (
              <div key={idx} className="content-table-wrapper">
                {block.title && <h4 className="content-table-title">{block.title}</h4>}
                <div className="table-responsive">
                  <table className="content-table">
                    {block.headers && block.headers.length > 0 && (
                      <thead>
                        <tr>
                          {block.headers.map((h, hIdx) => (
                            <th key={hIdx}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {block.rows?.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          case 'checkpoint': {
            const isGraded = block.ungraded === false;
            const marks = block.points || 5;
            return (
              <div key={idx} className="content-checkpoint-card">
                <div className="checkpoint-header">
                  <span className="checkpoint-badge">{isGraded ? '📝 GRADED TASK' : 'PRACTICE TASK'}</span>
                  <span className={`checkpoint-tag ${isGraded ? 'graded-tag' : ''}`} style={isGraded ? { background: '#4338ca', color: '#e0e7ff', border: '1px solid #6366f1' } : {}}>
                    {isGraded ? `${marks} MARKS` : 'UNGRADED PRACTICE'}
                  </span>
                </div>
                {block.title && <h3 className="checkpoint-title">{block.title}</h3>}
                {block.instructions && <p className="checkpoint-desc">{block.instructions}</p>}
                {block.code && (
                  <CodeBlock code={block.code} language={block.language || 'python'} />
                )}
              </div>
            );
          }

          case 'jupyter': {
            const isGraded = block.ungraded === false;
            const marks = block.points || 10;
            return (
              <div key={idx} className="lesson-jupyter-block-wrapper" style={{ marginBottom: '1.75rem' }}>
                {isGraded ? (
                  <div className="exercise-graded-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #1e1b4b, #2e2868)', padding: '0.65rem 1.25rem', borderRadius: '8px 8px 0 0', border: '1px solid #4338ca', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#e0e7ff', fontWeight: 700, fontSize: '0.875rem' }}>
                      <span>🏆 GRADED CODING EXERCISE</span>
                      <span style={{ background: '#4338ca', color: '#fff', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {marks} MARKS
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>Assessed Task</span>
                  </div>
                ) : (
                  <div className="exercise-ungraded-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1917', padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: '1px solid #78350f', borderBottom: 'none' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.8rem' }}>⚡ UNGRADED PRACTICE EXERCISE</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Self-Check Sandbox</span>
                  </div>
                )}
                <JupyterLiteExercise
                  title={block.title}
                  instructions={block.instructions}
                  starterCode={block.starterCode || block.code || 'print("Hello World!")'}
                  height={block.height || 450}
                  mode={block.mode || 'repl'}
                  notebookPath={block.notebookPath || ''}
                  readOnly={Boolean(block.readOnly)}
                />
              </div>
            );
          }

          default:
            return (
              <p key={idx} className="lesson-paragraph">
                {block.text || ''}
              </p>
            );
        }
      })}
    </div>
  );
}
