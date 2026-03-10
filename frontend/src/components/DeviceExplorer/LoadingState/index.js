import React, { memo } from 'react';

const LoadingState = memo(() => (
  <div className="device-explorer-container">
    <div className="explorer-main">
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading devices...</p>
      </div>
    </div>
  </div>
));

LoadingState.displayName = 'LoadingState';

export default LoadingState;
