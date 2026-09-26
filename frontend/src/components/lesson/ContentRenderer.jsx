import React, { useState } from 'react';
import JupyterLiteExercise from '../course/JupyterLiteExercise';

function CodeBlock({ code, language = 'python' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="content-code-block">
      <div className="code-header">
        <span className="code-lang">{language.toUpperCase()}</span>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
        >
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
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
