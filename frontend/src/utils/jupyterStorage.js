/**
 * Utility to read and extract code solutions from JupyterLite Notebooks in IndexedDB
 * EcoIntuition Academy
 */

export async function getJupyterNotebookContent(filename) {
  // 1. Try reading from IndexedDB (user's saved / edited notebook)
  try {
    const notebookFromDB = await new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = window.indexedDB.open('JupyterLite Storage - /lite/');
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains('files')) {
            db.close();
            return resolve(null);
          }
          const tx = db.transaction('files', 'readonly');
          const store = tx.objectStore('files');
          const getReq = store.get(filename);
          getReq.onsuccess = () => {
            db.close();
            const result = getReq.result;
            if (result && result.content) {
              const parsed = typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
              resolve(parsed);
            } else {
              resolve(null);
            }
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch (err) {
          db.close();
          resolve(null);
        }
      };
    });

    if (notebookFromDB && notebookFromDB.cells) {
      return notebookFromDB;
    }
  } catch (e) {
    console.warn('[jupyterStorage] IndexedDB read error:', e);
  }

  // 2. Fallback to master template file from /lite/files/
  try {
    const res = await fetch(`/lite/files/${encodeURIComponent(filename)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[jupyterStorage] Master template fetch error:', e);
  }

  return null;
}

/**
 * Extracts question-to-code mapping from a loaded .ipynb notebook object
 * @param {Object} notebook - parsed .ipynb JSON
 * @param {Array} questions - questions array from assessment definition
 * @param {Number} moduleNumber - module number (2, 3, 4)
 * @returns {Object} { [questionId]: stringOfCode }
 */
export function extractCodeFromNotebook(notebook, questions = [], moduleNumber = 2) {
  const codeMap = {};
  if (!notebook || !Array.isArray(notebook.cells)) {
    return codeMap;
  }

  // Filter only code cells
  const codeCells = notebook.cells.filter((c) => c.cell_type === 'code');

  // Helper to join cell source lines
  const getCellCode = (cell) => {
    if (Array.isArray(cell.source)) {
      return cell.source.join('');
    }
    return String(cell.source || '');
  };

  // Match by tags first
  questions.forEach((q, idx) => {
    const qId = q.id;
    // Check if any code cell has this qId or variation in tags
    const taggedCell = codeCells.find((c) => {
      const tags = c.metadata?.tags || [];
      return tags.some((t) => {
        const lowerT = String(t).toLowerCase();
        const lowerQ = String(qId).toLowerCase();
        return lowerT === lowerQ || lowerT === `${lowerQ}-answer` || lowerT === `hw-${lowerQ}`;
      });
    });

    if (taggedCell) {
      codeMap[qId] = getCellCode(taggedCell);
    } else if (codeCells[idx]) {
      // Fallback: match by sequential code cell index
      codeMap[qId] = getCellCode(codeCells[idx]);
    } else {
      codeMap[qId] = '';
    }
  });

  return codeMap;
}
