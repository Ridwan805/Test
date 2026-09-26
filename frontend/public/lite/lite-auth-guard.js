/**
 * EcoIntuition Academy - JupyterLite Auth & Cell/Tab Protection Guard
 * 
 * Enforces role-based permissions in JupyterLite:
 * - Administrators (is_staff=true): Full permissions to edit, cut, delete cells and manage tabs.
 * - Students / Normal Users: Cell deletion, cell cutting, and tab deletion are strictly disabled.
 */
(function () {
  function checkIsAdmin() {
    try {
      // 1. Direct localStorage flag set by EcoIntuition AuthContext
      const staffLocal = localStorage.getItem('user_is_staff');
      if (staffLocal === 'true') return true;

      // 2. Check parent window localStorage if embedded inside iframe
      if (window.parent && window.parent !== window) {
        try {
          const parentStaff = window.parent.localStorage?.getItem('user_is_staff');
          if (parentStaff === 'true') return true;
        } catch (e) {}
      }

      // 3. URL search params verification
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1') {
        // If explicitly set to admin=1 and not registered as a non-staff user
        if (staffLocal !== 'false') return true;
      }
    } catch (e) {
      console.warn('[LiteGuard] Error checking admin status:', e);
    }
    return false;
  }

  const isAdmin = checkIsAdmin();

  if (isAdmin) {
    console.log('[LiteGuard] 🛡️ Administrator session active. Full editing and cell/tab deletion enabled.');
    return;
  }

  console.log('[LiteGuard] 🔒 Student session active. Cell and tab deletion is protected.');

  // Inject protective CSS for non-admin students
  const style = document.createElement('style');
  style.id = 'lite-protection-guard-styles';
  style.textContent = `
    /* Hide delete and cut buttons on cell toolbars and main toolbar */
    [data-command="notebook:delete-cell"],
    [data-command="notebook:cut-cell"],
    [data-command="notebook:cut"],
    [data-command="editmenu:delete-cells"],
    [data-command="editmenu:cut"],
    jp-button[aria-label*="Delete" i],
    jp-button[title*="Delete" i],
    jp-button[aria-label*="Cut" i],
    jp-button[title*="Cut" i],
    button[aria-label*="Delete the cell" i],
    button[aria-label*="Cut this cell" i],
    button[title*="Delete the cell" i],
    button[title*="Cut this cell" i],
    /* Tab close buttons (close 'x' icon on tabs) */
    .lm-TabBar-tabCloseIcon,
    .p-TabBar-tabCloseIcon,
    .jp-mod-closable > .lm-TabBar-tabCloseIcon,
    .lm-TabBar-tab.jp-mod-closable .lm-TabBar-tabCloseIcon {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Style student status indicator in header if present */
    .lite-student-guard-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(14, 165, 233, 0.15);
      color: #0284c7;
      border: 1px solid rgba(14, 165, 233, 0.3);
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 12px;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  // Show Toast notification when user attempts blocked action
  function showNotice(msg) {
    let toast = document.getElementById('lite-guard-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lite-guard-toast';
      toast.style.cssText = [
        'position: fixed',
        'bottom: 24px',
        'right: 24px',
        'background: #0f172a',
        'color: #f8fafc',
        'padding: 12px 20px',
        'border-radius: 10px',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 13px',
        'font-weight: 500',
        'box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35)',
        'border: 1px solid #334155',
        'z-index: 9999999',
        'transition: all 0.25s ease',
        'display: flex',
        'align-items: center',
        'gap: 10px',
        'pointer-events: none',
        'opacity: 0',
        'transform: translateY(12px)'
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span style="font-size:16px;">🔒</span> <span>' + msg + '</span>';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
    }, 4000);
  }

  const deleteSelectors = [
    '[data-command="notebook:delete-cell"]',
    '[data-command="notebook:cut-cell"]',
    '[data-command="notebook:cut"]',
    '[data-command="editmenu:delete-cells"]',
    '[data-command="editmenu:cut"]',
    '[aria-label*="Delete the cell" i]',
    '[aria-label*="Delete cell" i]',
    '[aria-label*="Cut this cell" i]',
    '[aria-label*="Cut cell" i]',
    '[title*="Delete the cell" i]',
    '[title*="Delete cell" i]',
    '[title*="Cut this cell" i]',
    '[title*="Cut cell" i]',
    '.lm-TabBar-tabCloseIcon',
    '.p-TabBar-tabCloseIcon'
  ];

  // 1. Intercept pointer and click events in the capture phase
  function handleBlockedClick(e) {
    for (const sel of deleteSelectors) {
      if (e.target && e.target.closest && e.target.closest(sel)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const isTab = e.target.closest('.lm-TabBar-tabCloseIcon, .p-TabBar-tabCloseIcon');
        showNotice(
          isTab
            ? 'Tab closing is disabled for students. Only an administrator can delete or close tabs.'
            : 'Cell deletion is disabled for students. Only an administrator can delete cells or tabs.'
        );
        return false;
      }
    }
  }

  document.addEventListener('click', handleBlockedClick, true);
  document.addEventListener('pointerdown', handleBlockedClick, true);
  document.addEventListener('mousedown', handleBlockedClick, true);

  // 2. Intercept keyboard shortcuts in command mode (D,D to delete, X to cut)
  let lastDTime = 0;
  window.addEventListener('keydown', function (e) {
    const active = document.activeElement;
    const isEditingText = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable ||
      active.closest('.cm-content') ||
      active.closest('.CodeMirror') ||
      active.closest('.jp-InputArea-editor')
    );

    // If user is actively typing inside code or markdown text, allow normal typing
    if (isEditingText) {
      return;
    }

    const key = e.key ? e.key.toLowerCase() : '';

    // 'x' cut cell shortcut in command mode
    if (key === 'x') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showNotice('Cutting cells is disabled for students.');
      return false;
    }

    // 'd, d' delete cell shortcut in command mode
    if (key === 'd') {
      const now = Date.now();
      if (now - lastDTime < 1000) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        lastDTime = 0;
        showNotice('Cell deletion is disabled for students. Only an administrator can delete cells or tabs.');
        return false;
      }
      lastDTime = now;
    }
  }, true);

  // 3. MutationObserver to remove delete/cut items from context menus and dynamic toolbars
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // If a context menu opened (Lumino / JupyterLab menu)
          if (node.classList && (node.classList.contains('lm-Menu') || node.classList.contains('p-Menu'))) {
            const menuItems = node.querySelectorAll('.lm-Menu-item, .p-Menu-item');
            menuItems.forEach((item) => {
              const text = (item.textContent || '').trim().toLowerCase();
              const cmd = item.getAttribute('data-command') || '';
              if (
                text.includes('delete cell') ||
                text.includes('delete cells') ||
                text.includes('cut cell') ||
                text.includes('cut cells') ||
                cmd.includes('delete-cell') ||
                cmd.includes('cut-cell')
              ) {
                item.style.display = 'none';
                item.style.pointerEvents = 'none';
              }
            });
          }

          // Check if newly added buttons match delete/cut
          deleteSelectors.forEach((sel) => {
            if (node.matches && node.matches(sel)) {
              node.style.display = 'none';
              node.style.pointerEvents = 'none';
            }
            if (node.querySelectorAll) {
              node.querySelectorAll(sel).forEach((el) => {
                el.style.display = 'none';
                el.style.pointerEvents = 'none';
              });
            }
          });
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // 4. Hook into JupyterLab / Notebook application command registry if available
  function hookAppCommands() {
    const app = window.jupyterapp || window.jupyterLab;
    if (app && app.commands && !app._liteGuardHooked) {
      app._liteGuardHooked = true;
      const blocked = [
        'notebook:delete-cell',
        'notebook:cut-cell',
        'notebook:cut',
        'editmenu:delete-cells',
        'editmenu:cut'
      ];
      const originalExecute = app.commands.execute.bind(app.commands);
      app.commands.execute = function (id, args) {
        if (blocked.includes(id)) {
          console.warn('[LiteGuard] Blocked application command:', id);
          showNotice('Cell deletion is disabled for students. Only an administrator can delete cells or tabs.');
          return Promise.resolve(null);
        }
        return originalExecute(id, args);
      };
      console.log('[LiteGuard] Successfully hooked JupyterLite command registry.');
    }
  }

  // Attempt command hooking periodically until app is initialized
  let hookAttempts = 0;
  const hookInterval = setInterval(() => {
    hookAttempts++;
    hookAppCommands();
    if (window.jupyterapp || window.jupyterLab || hookAttempts > 25) {
      clearInterval(hookInterval);
    }
  }, 400);
})();
