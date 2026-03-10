import React, { memo } from 'react';

const ErrorState = memo(({ error, onRetry }) => (
  <div className="device-explorer-container">
    <div className="explorer-main">
      <div className="error-state">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  </div>
));

ErrorState.displayName = 'ErrorState';

export default ErrorState;
