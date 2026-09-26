import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Reusable JupyterLite Exercise & Notebook Lab Component for EcoIntuition Academy
 * Provides lazy-mounting, starter-code loading, full notebook support,
 * tab opening for browser-based persistent practice, role-based protection (only admins can delete cells/tabs),
 * and responsive iframe execution.
 */
export default function JupyterLiteExercise({
  title = 'Python Practice Exercise',
  instructions = 'Run the program below and observe the output.',
  starterCode = 'print("Hello World!")',
  height = 450,
  mode = 'repl',
  notebookPath = '',
  readOnly = false
}) {
  const { user } = useContext(AuthContext);
  const isAdmin = Boolean(user?.is_staff);

  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const handleStart = () => {
    setIsStarted(true);
    setIsLoading(true);
    setHasError(false);
  };

  const handleReset = () => {
    setIsLoading(true);
    setHasError(false);
    setSessionKey((prev) => prev + 1);
  };

  const isNotebook = mode === 'notebook';

  // URL for full notebook in new tab (or embedded) with role parameter
  const adminParam = isAdmin ? '&admin=1' : '&admin=0';
  const fullNotebookUrl = notebookPath
    ? `/lite/notebooks/index.html?path=${encodeURIComponent(notebookPath)}${adminParam}`
    : `/lite/notebooks/index.html?${adminParam.slice(1)}`;

  // URL for the inline embedded iframe
  const jupyterUrl = isNotebook
    ? fullNotebookUrl
    : `/lite/repl/index.html?kernel=python&toolbar=1&code=${encodeURIComponent(starterCode)}${adminParam}`;

  return (
    <div
      className={`jupyter-exercise-card ${isNotebook ? 'jupyter-notebook-mode' : ''} ${
        readOnly ? 'jupyter-readonly-card' : ''
      }`}
    >
      <div className="jupyter-exercise-header">
        <div className="jupyter-header-left">
          <span className={`jupyter-badge ${isAdmin ? 'badge-admin' : ''}`}>
            {isAdmin
              ? '🛡️ ADMIN WORKSPACE'
              : readOnly
              ? '🔒 PROTECTED DEMONSTRATION'
              : isNotebook
              ? 'INTERACTIVE NOTEBOOK LAB'
              : 'BUILT-IN PYTHON IDE'}
          </span>
          <h3 className="jupyter-title">{title}</h3>
        </div>
        <div className="jupyter-header-right-actions">
          <a
            href={fullNotebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="jupyter-open-tab-btn"
            title="Open in new tab to practice, add cells, and save your notebook locally"
          >
            <span>↗ Open Notebook in New Tab & Save</span>
          </a>
          <div className="jupyter-status-pill">
            <span className="status-dot-pulse" />
            <span>Browser Pyodide IDE</span>
          </div>
        </div>
      </div>

      {instructions && (
        <div className="jupyter-instructions">
          <p>{instructions}</p>
        </div>
      )}

      {isAdmin ? (
        <div className="jupyter-readonly-notice jupyter-admin-notice">
          <span className="readonly-icon">🛡️</span>
          <span>
            <strong>Administrator Privileges Active:</strong> You have full administrative permissions to create, edit, cut, and delete notebook cells and manage workspace tabs.
          </span>
        </div>
      ) : readOnly ? (
        <div className="jupyter-readonly-notice">
          <span className="readonly-icon">🔒</span>
          <span>
            <strong>Protected Student Environment:</strong> Example cells and tabs are protected against deletion. Only an administrator can delete cells or tabs. To test and verify the output, run the cells below or open in a separate tab to practice.
          </span>
        </div>
      ) : null}

      {!isStarted ? (
        <div className="jupyter-starter-preview">
          <div className="starter-code-header">
            <span className="starter-lbl">
              {readOnly
                ? 'EXAMPLE CODE (LOCKED)'
                : isNotebook
                ? 'NOTEBOOK LAB'
                : 'STARTER CODE'}
            </span>
            <span className="starter-tech">PYTHON 3 · PYODIDE</span>
          </div>

          {!isNotebook ? (
            <pre className="starter-pre">
              <code>{starterCode}</code>
            </pre>
          ) : (
            <div className="notebook-preview-card">
              <div className="notebook-preview-meta">
                <span className="notebook-icon">📓</span>
                <div>
                  <strong className="notebook-name">{notebookPath || 'Interactive Python Notebook'}</strong>
                  <p className="notebook-desc">
                    Contains all lesson examples pre-loaded with runnable cells, explanations, and practice space.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="jupyter-start-cta">
            <button
              type="button"
              className="btn btn-primary jupyter-start-btn"
              onClick={handleStart}
            >
              {readOnly
                ? 'Run Example Live ▶'
                : isNotebook
                ? 'Launch Interactive Notebook →'
                : 'Start Built-in IDE →'}
            </button>
            <a
              href={fullNotebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary jupyter-tab-link-btn"
            >
              Open in Separate Tab ↗
            </a>
            <span className="jupyter-hint">
              ⚡ Runs client-side in your browser with zero installation · Saves locally
            </span>
          </div>
        </div>
      ) : (
        <div className="jupyter-active-workspace">
          <div className="workspace-controls-bar">
            <div className="workspace-left">
              <span className="workspace-dot green" />
              <span className="workspace-name">
                {isAdmin
                  ? '🛡️ Admin Master Workspace · Full Privileges'
                  : readOnly
                  ? '🔒 Protected Reference Example · Live Output'
                  : isNotebook
                  ? 'Interactive Jupyter Notebook Running'
                  : 'Python Built-in IDE Active'}
              </span>
            </div>
            <div className="workspace-actions">
              <a
                href={fullNotebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-workspace-link"
                title="Open in new tab to practice freely and save"
              >
                ↗ Open in Full Tab & Save
              </a>
              <button
                type="button"
                className="btn-workspace-action"
                onClick={handleReset}
                title="Reload notebook/environment"
              >
                ↺ Reload
              </button>
            </div>
          </div>

          <div
            className="jupyter-iframe-wrapper"
            style={{ minHeight: `${height}px`, height: `${height}px` }}
          >
            {isLoading && !hasError && (
              <div className="jupyter-loading-overlay">
                <div className="jupyter-spinner" />
                <p className="jupyter-loading-text">
                  Preparing Python environment in your browser...
                </p>
                <span className="jupyter-loading-subtext">
                  Initializing WebAssembly Pyodide kernel
                </span>
              </div>
            )}

            {hasError ? (
              <div className="jupyter-error-state">
                <span className="error-icon">⚠️</span>
                <h4>Could not load the Python environment</h4>
                <p>
                  Please ensure WebAssembly is supported and enabled in your browser.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleReset}
                >
                  Retry Loading Environment
                </button>
              </div>
            ) : (
              <iframe
                key={sessionKey}
                src={jupyterUrl}
                title={title}
                className="jupyter-lite-iframe"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                sandbox="allow-scripts allow-same-origin allow-modals allow-downloads allow-forms"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
