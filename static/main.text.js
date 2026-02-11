function getCurrentPath() {
  return window.location.pathname.slice(1);
}
mermaid.initialize({
  securityLevel: "loose",
  theme: "dark",
});

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
        icon.textContent = '☰';
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
        icon.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
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
        chevron.textContent = isOpen ? '▼' : '▶';
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
        e.target.textContent = expanded ? '▼' : '▶';
      }
    }
  });

  setupWebsocket();
});

