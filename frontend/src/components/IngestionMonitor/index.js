import React, { Component } from 'react';
import './index.css';

class IngestionMonitor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentStage: 3, // Currently on "Validation" stage
      stages: [
        { id: 1, name: 'File Discovery', status: 'complete', progress: 100, icon: '🔍' },
        { id: 2, name: 'Parsing', status: 'complete', progress: 100, icon: '📋' },
        { id: 3, name: 'Validation', status: 'processing', progress: 67, icon: '✓' },
        { id: 4, name: 'Normalization', status: 'pending', progress: 0, icon: '⚙' },
        { id: 5, name: 'Deduplication', status: 'pending', progress: 0, icon: '🔄' },
        { id: 6, name: 'Database Sync', status: 'pending', progress: 0, icon: '💾' }
      ],
      fileQueue: [
        { id: 1, name: 'devices_q1_2026.csv', rows: 2847, status: 'processing', progress: 67, eta: '2 mins' },
        { id: 2, name: 'lab_inventory.xlsx', rows: 1892, status: 'queued', progress: 0, eta: '5 mins' },
        { id: 3, name: 'accessories_batch.csv', rows: 456, status: 'queued', progress: 0, eta: '7 mins' }
      ],
      ingestionHistory: [
        { id: 1, filename: 'devices_december.csv', rows: 3214, status: 'success', duration: '2m 34s', timestamp: '2026-02-15 09:23:41' },
        { id: 2, filename: 'stb_update_jan.xlsx', rows: 1567, status: 'success', duration: '1m 48s', timestamp: '2026-02-14 16:45:22' },
        { id: 3, filename: 'remote_inventory.csv', rows: 892, status: 'partial', duration: '1m 12s', timestamp: '2026-02-14 11:30:15' },
        { id: 4, filename: 'tv_batch_03.csv', rows: 4521, status: 'success', duration: '3m 56s', timestamp: '2026-02-13 14:20:08' },
        { id: 5, filename: 'accessories_q4.xlsx', rows: 234, status: 'failed', duration: '0m 45s', timestamp: '2026-02-12 10:15:33' }
      ],
      logs: [
        { time: '14:23:45', level: 'INFO', message: 'Processing row 1847 of 2847' },
        { time: '14:23:44', level: 'INFO', message: 'Validation checkpoint reached' },
        { time: '14:23:42', level: 'WARNING', message: 'Duplicate serial number detected: SN2K8H9JK' },
        { time: '14:23:40', level: 'INFO', message: 'Parsing completed successfully' },
        { time: '14:23:38', level: 'INFO', message: 'File discovered: devices_q1_2026.csv' }
      ]
    };

    this.logInterval = null;
  }

  componentDidMount() {
    // Simulate real-time log updates
    this.logInterval = setInterval(() => {
      this.addRandomLog();
    }, 3000);

    // Simulate progress updates
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 2000);
  }

  componentWillUnmount() {
    if (this.logInterval) clearInterval(this.logInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
  }

  addRandomLog = () => {
    const messages = [
      'Processing validation rules',
      'Checking data integrity',
      'Normalization in progress',
      'Applying business rules',
      'Verifying foreign keys'
    ];
    const levels = ['INFO', 'WARNING', 'INFO', 'INFO'];
    
    const newLog = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)]
    };

    this.setState(prevState => ({
      logs: [newLog, ...prevState.logs.slice(0, 9)]
    }));
  }

  updateProgress = () => {
    this.setState(prevState => {
      const currentStage = prevState.currentStage;
      const stages = [...prevState.stages];
      
      if (stages[currentStage - 1].progress < 100) {
        stages[currentStage - 1].progress = Math.min(100, stages[currentStage - 1].progress + 5);
      }

      return { stages };
    });
  }

  getStatusColor = (status) => {
    const colors = {
      complete: 'var(--color-success)',
      processing: 'var(--color-primary)',
      pending: 'var(--color-text-tertiary)',
      success: 'var(--color-success)',
      partial: 'var(--color-warning)',
      failed: 'var(--color-danger)',
      queued: 'var(--color-info)'
    };
    return colors[status] || 'var(--color-text-secondary)';
  }

  renderPipelineStage(stage, index, isLast) {
    const isActive = stage.status === 'processing';
    const isComplete = stage.status === 'complete';

    return (
      <div key={stage.id} className="pipeline-stage-wrapper">
        <div className={`pipeline-stage ${stage.status}`}>
          <div className="stage-icon-container">
            <span className="stage-icon">{stage.icon}</span>
            {isActive && <div className="stage-pulse" />}
          </div>
          <div className="stage-content">
            <div className="stage-name">{stage.name}</div>
            <div className="stage-progress-bar">
              <div 
                className="stage-progress-fill"
                style={{ 
                  width: `${stage.progress}%`,
                  background: this.getStatusColor(stage.status)
                }}
              />
            </div>
            <div className="stage-status-text">
              {stage.status === 'complete' && 'Complete'}
              {stage.status === 'processing' && `${stage.progress}%`}
              {stage.status === 'pending' && 'Pending'}
            </div>
          </div>
        </div>
        {!isLast && (
          <div className={`pipeline-connector ${isComplete ? 'active' : ''}`}>
            <svg width="40" height="2" viewBox="0 0 40 2">
              <line x1="0" y1="1" x2="40" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="4,4" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  renderFileQueue() {
    const { fileQueue } = this.state;

    return (
      <div className="file-queue-panel glass-panel">
        <h3 className="panel-title">
          File Queue
          <span className="queue-count">{fileQueue.length} files</span>
        </h3>
        <div className="file-queue-list">
          {fileQueue.map((file, index) => (
            <div key={file.id} className="queue-file-item" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="file-icon-container">
                {file.status === 'processing' ? (
                  <div className="spinner-small" />
                ) : (
                  <span className="file-icon">📄</span>
                )}
              </div>
              <div className="file-details">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">{file.rows.toLocaleString()} rows • ETA: {file.eta}</div>
                {file.status === 'processing' && (
                  <div className="file-progress-bar">
                    <div 
                      className="file-progress-fill"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div 
                className="file-status-badge"
                style={{ 
                  background: `${this.getStatusColor(file.status)}20`,
                  color: this.getStatusColor(file.status)
                }}
              >
                {file.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderIngestionHistory() {
    const { ingestionHistory } = this.state;

    return (
      <div className="history-panel glass-panel">
        <h3 className="panel-title">Ingestion History</h3>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Rows</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {ingestionHistory.map((item, index) => (
                <tr key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="history-filename mono">{item.filename}</td>
                  <td>{item.rows.toLocaleString()}</td>
                  <td className="mono">{item.duration}</td>
                  <td>
                    <span 
                      className="history-status-badge"
                      style={{ 
                        background: `${this.getStatusColor(item.status)}20`,
                        color: this.getStatusColor(item.status)
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="mono">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  renderAuditLog() {
    const { logs } = this.state;

    return (
      <div className="audit-log-panel glass-panel">
        <h3 className="panel-title">
          Live Audit Log
          <span className="live-indicator-small">
            <span className="pulse-dot" />
            Live
          </span>
        </h3>
        <div className="log-container">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`log-entry log-${log.level.toLowerCase()}`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="log-time mono">{log.time}</span>
              <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { stages } = this.state;

    return (
      <div className="ingestion-monitor-container">
        <div className="monitor-header">
          <div>
            <h1 className="monitor-title gradient-text">Backend Processing Monitor</h1>
            <p className="monitor-subtitle">Real-time ingestion pipeline visualization</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary">
              <span>⏸</span> Pause Pipeline
            </button>
            <button className="btn btn-primary">
              <span>↻</span> Refresh
            </button>
          </div>
        </div>

        <div className="pipeline-visualization glass-panel">
          <h3 className="panel-title">Pipeline Stages</h3>
          <div className="pipeline-flow">
            {stages.map((stage, index) => 
              this.renderPipelineStage(stage, index, index === stages.length - 1)
            )}
          </div>
        </div>

        <div className="monitor-grid">
          <div className="monitor-column-left">
            {this.renderFileQueue()}
            {this.renderAuditLog()}
          </div>
          <div className="monitor-column-right">
            {this.renderIngestionHistory()}
          </div>
        </div>
      </div>
    );
  }
}

export default IngestionMonitor;
