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
            return (
              <div key={idx} className="content-checkpoint-card">
                <div className="checkpoint-header">
                  <span className="checkpoint-badge">TRUTH-TABLE CHECKPOINT</span>
                  <span className="checkpoint-tag">UNGRADED PRACTICE</span>
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
            return (
              <JupyterLiteExercise
                key={idx}
                title={block.title}
                instructions={block.instructions}
                starterCode={block.starterCode || block.code || 'print("Hello World!")'}
                height={block.height || 450}
                mode={block.mode || 'repl'}
                notebookPath={block.notebookPath || ''}
                readOnly={Boolean(block.readOnly)}
              />
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
