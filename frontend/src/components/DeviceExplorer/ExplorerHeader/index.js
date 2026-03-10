import React, { memo } from 'react';

const ExplorerHeader = memo(({ totalRecords, onToggleFilter, onExport }) => {
  return (
    <div className="explorer-header">
      <div>
        <h1 className="explorer-title gradient-text">Device Explorer</h1>
        <p className="explorer-subtitle">{totalRecords} devices found</p>
      </div>
      <div className="header-actions">
        <button className="btn btn-secondary" onClick={onToggleFilter}>
          <span>⚙</span> Filters
        </button>
        <button className="btn btn-primary" onClick={onExport}>
          <span>⤓</span> Export
        </button>
      </div>
    </div>
  );
});

ExplorerHeader.displayName = 'ExplorerHeader';

export default ExplorerHeader;
