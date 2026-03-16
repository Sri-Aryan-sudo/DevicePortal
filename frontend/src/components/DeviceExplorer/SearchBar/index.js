import React, { memo } from 'react';

const SearchBar = memo(({ searchQuery, onSearchChange, onSearchClear }) => {
  return (
    <div className="search-bar glass-panel">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search by Vendor, Model Type, MAC Address, or Team..."
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
