// Theme initialization (runs in <head> before body paint)
function getStoredTheme() {
  try {
    return localStorage.getItem('theme') || 'dark';
  } catch {
    return 'dark';
  }
}

const initialTheme = getStoredTheme();
document.documentElement.setAttribute('data-theme', initialTheme);

mermaid.initialize({
  securityLevel: "loose",
  theme: initialTheme === 'dark' ? 'dark' : 'default',
});

// Mermaid source preservation
const mermaidSources = new WeakMap();

function saveMermaidSources() {
  document.querySelectorAll('.mermaid:not([data-processed])').forEach(el => {
    if (el.textContent.trim()) {
      mermaidSources.set(el, el.textContent);
    }
  });
}

async function reRenderMermaid(theme) {
  mermaid.initialize({
    securityLevel: "loose",
    theme: theme === 'dark' ? 'dark' : 'default',
  });
  const elements = document.querySelectorAll('.mermaid[data-processed]');
  elements.forEach(el => {
    const source = mermaidSources.get(el);
    if (source) {
      el.removeAttribute('data-processed');
      el.textContent = source;
    }
  });
  if (elements.length > 0) {
    await mermaid.run();
  }
}

function getCurrentPath() {
  return window.location.pathname.slice(1);
}

async function refreshSidebar() {
  const response = await fetch(`/__only-sidebar/${getCurrentPath()}`);
  const html = await response.text();
  const element = document.getElementById("sidebar-container");

  element.innerHTML = html;
}

async function refreshContent() {
  const response = await fetch(`/__partials/${getCurrentPath()}`);
  const html = await response.text();
  if (html === "NO_UPDATE") {
    return;
  }

  const element = document.getElementById("content-container");
  element.innerHTML = html;
  saveMermaidSources();
  await mermaid.run();
}

function refreshPage() {
  refreshSidebar();
  refreshContent();
}


function setupWebsocket() {
  const socket = new WebSocket("/__update-listener")
  socket.onmessage = () => {
    refreshPage();
  }
  socket.onerror = () => {
    console.log(`Websocket failed. Refresh the page to fix it`)
  }
}


document.addEventListener('DOMContentLoaded', function() {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  function isMobileView() {
    return window.innerWidth <= 1024;
  }

  function updateSidebarForResize() {
    if (!isMobileView()) {
      sidebar.classList.remove('collapsed');
      const icon = sidebarToggle?.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = '\u2630';
      }
    }
  }

  updateSidebarForResize();
  window.addEventListener('resize', updateSidebarForResize);

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      const icon = sidebarToggle.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = sidebar.classList.contains('collapsed') ? '\u2630' : '\u2715';
      }
    });
  }

  function syncChevronStates() {
    document.querySelectorAll('details').forEach(details => {
      const summary = details.querySelector('summary');
      const chevron = summary?.querySelector('.folder-chevron');

      if (chevron && summary) {
        const isOpen = details.open;
        summary.classList.toggle('expanded', isOpen);
        chevron.textContent = isOpen ? '\u25BC' : '\u25B6';
      }
    });
  }

  syncChevronStates();

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('folder-chevron')) {
      e.preventDefault();
      e.stopPropagation();

      const summary = e.target.closest('summary');
      const details = summary.closest('details');

      if (details) {
        details.open = !details.open;
        const expanded = details.open;
        summary.classList.toggle('expanded', expanded);
        e.target.textContent = expanded ? '\u25BC' : '\u25B6';
      }
    }
  });

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');

  function updateThemeIcon(theme) {
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    }
  }

  async function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {}
    updateThemeIcon(theme);
    await reRenderMermaid(theme);
  }

  updateThemeIcon(getStoredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Print handling
  document.addEventListener('keydown', async function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      const prevTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      if (prevTheme !== 'light') {
        await setTheme('light');
      }
      window.print();
      if (prevTheme !== 'light') {
        await setTheme(prevTheme);
      }
    }
  });

  let themeBeforePrint = null;

  window.addEventListener('beforeprint', function() {
    themeBeforePrint = document.documentElement.getAttribute('data-theme') || 'dark';
    if (themeBeforePrint !== 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  });

  window.addEventListener('afterprint', function() {
    if (themeBeforePrint && themeBeforePrint !== 'light') {
      setTheme(themeBeforePrint);
    }
    themeBeforePrint = null;
  });

  // Save mermaid sources for any diagrams already in the page
  saveMermaidSources();

  setupWebsocket();
  initSearch();
});

// Search functionality
function initSearch() {
  const modal = document.getElementById('search-modal');
  const backdrop = modal?.querySelector('.search-modal-backdrop');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!modal || !input || !resultsContainer) return;

  let debounceTimer = null;
  let selectedIndex = -1;
  let currentResults = [];

  function openSearch() {
    modal.style.display = 'flex';
    input.value = '';
    resultsContainer.innerHTML = '<div class="search-empty">Type to search...</div>';
    selectedIndex = -1;
    currentResults = [];
    // Delay focus slightly so the key event doesn't land in the input
    requestAnimationFrame(() => input.focus());
  }

  function closeSearch() {
    modal.style.display = 'none';
    input.value = '';
    selectedIndex = -1;
    currentResults = [];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderResults(results) {
    currentResults = results;
    selectedIndex = -1;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-empty">No results found</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const icon = r.type === 'filename' && !r.matches ? '\uD83D\uDCC4' : '\uD83D\uDD0D';

      html += '<div class="search-result-item" data-index="' + i + '">';
      html += '<div class="search-result-header">';
      html += '<span class="search-result-icon">' + icon + '</span>';
      html += '<span class="search-result-filename">' + escapeHtml(r.filename) + '</span>';
      html += '<span class="search-result-path">' + escapeHtml(r.displayPath) + '</span>';
      html += '</div>';

      if (r.matches && r.matches.length > 0) {
        html += '<div class="search-result-matches">';
        for (const m of r.matches) {
          const before = escapeHtml(m.lineContent.slice(0, m.matchStart));
          const match = escapeHtml(m.lineContent.slice(m.matchStart, m.matchEnd));
          const after = escapeHtml(m.lineContent.slice(m.matchEnd));
          html += '<div class="search-match-line">';
          html += '<span class="search-match-linenum">' + m.lineNumber + '</span>';
          html += '<span class="search-match-text">' + before + '<span class="search-highlight">' + match + '</span>' + after + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    resultsContainer.innerHTML = html;
  }

  function updateSelection() {
    const items = resultsContainer.querySelectorAll('.search-result-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function navigateToResult(index) {
    if (index < 0 || index >= currentResults.length) return;
    const result = currentResults[index];
    closeSearch();
    window.location.href = result.displayPath;
  }

  // Open: Ctrl+K / Cmd+K
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }
    // "/" key when not in an input field
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openSearch();
    }
  });

  // Close on backdrop click
  if (backdrop) {
    backdrop.addEventListener('click', closeSearch);
  }

  // Header search button
  const searchToggle = document.getElementById('search-toggle');
  if (searchToggle) {
    searchToggle.addEventListener('click', openSearch);
  }

  // Input handling with keyboard nav
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
        updateSelection();
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        navigateToResult(selectedIndex);
      } else if (currentResults.length > 0) {
        navigateToResult(0);
      }
      return;
    }
  });

  // Debounced search on input
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const query = input.value.trim();

    if (query.length < 2) {
      resultsContainer.innerHTML = '<div class="search-empty">Type to search...</div>';
      currentResults = [];
      selectedIndex = -1;
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch('/__search?q=' + encodeURIComponent(query));
        const results = await response.json();
        // Only update if input hasn't changed
        if (input.value.trim() === query) {
          renderResults(results);
        }
      } catch {
        resultsContainer.innerHTML = '<div class="search-empty">Search error</div>';
      }
    }, 300);
  });

  // Click on result
  resultsContainer.addEventListener('click', function(e) {
    const item = e.target.closest('.search-result-item');
    if (item) {
      const index = parseInt(item.dataset.index, 10);
      navigateToResult(index);
    }
  });
}
