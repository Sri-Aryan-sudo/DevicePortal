import React, { memo } from 'react';

const SearchBar = memo(({ searchQuery, onSearchChange, onSearchClear }) => {
  return (
    <div className="search-bar glass-panel">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search by MAC Address, Model, or Alias..."
        value={searchQuery}
        onChange={onSearchChange}
        className="search-input"
      />
      {searchQuery && (
        <button className="search-clear" onClick={onSearchClear}>
          ×
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
