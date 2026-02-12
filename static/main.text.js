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
});
