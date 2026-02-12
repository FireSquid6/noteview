export function SearchModal(): JSX.Element {
  return (
    <div id="search-modal" style="display:none">
      <div class="search-modal-backdrop"></div>
      <div class="search-modal-content">
        <div class="search-input-wrapper">
          <span class="search-icon">&#x1F50D;</span>
          <input
            id="search-input"
            type="text"
            placeholder="Search files and content..."
            autocomplete="off"
          />
          <kbd class="search-hint">ESC</kbd>
        </div>
        <div id="search-results" class="search-results">
          <div class="search-empty">Type to search...</div>
        </div>
      </div>
    </div>
  );
}
