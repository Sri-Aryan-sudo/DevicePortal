import React, { memo } from 'react';

const FilterPanel = memo(({ 
  isOpen, 
  selectedFilters, 
  filterOptions, 
  onClose, 
  onFilterChange, 
  onClearFilters 
}) => {
  const filters = {
    deviceType: filterOptions.deviceTypes,
    vendor: filterOptions.vendors,
    team: filterOptions.teams
  };

  return (
    <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
      <div className="filter-header">
        <h3>Filters</h3>
        <button className="filter-close" onClick={onClose}>
          ×
        </button>
      </div>

      {Object.entries(filters).map(([category, options]) => (
        <div key={category} className="filter-section">
          <h4 className="filter-section-title">
            {category.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <div className="filter-options">
            {options.map(option => (
              <label key={option} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedFilters[category].includes(option)}
                  onChange={() => onFilterChange(category, option)}
                />
                <span className="filter-checkbox" />
                <span className="filter-label">{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button className="btn btn-secondary filter-clear" onClick={onClearFilters}>
        Clear All Filters
      </button>
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
