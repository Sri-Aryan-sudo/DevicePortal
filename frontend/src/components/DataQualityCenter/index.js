import React, { Component } from 'react';
import './index.css';
import { dataQualityAPI } from '../../services/api';

class DataQualityCenter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      overallScore: 0,
      issues: [],
      trendData: [],
      issuesByType: [],
      loading: true,
      error: null
    };
  }

  async componentDidMount() {
    await this.fetchDataQuality();
  }

  fetchDataQuality = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await dataQualityAPI.getQualityMetrics();
      
      this.setState({
        overallScore: response.data.overallScore,
        issues: response.data.issues,
        trendData: response.data.trendData,
        issuesByType: response.data.issuesByType,
        loading: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load data quality metrics',
        loading: false 
      });
    }
  }

  getSeverityColor = (severity) => {
    const colors = {
      high: 'var(--color-danger)',
      medium: 'var(--color-warning)',
      low: 'var(--color-info)'
    };
    return colors[severity] || 'var(--color-text-secondary)';
  }

  renderQualityScore() {
    const { overallScore } = this.state;
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (overallScore / 100) * circumference;

    return (
      <div className="quality-score-panel glass-panel">
        <h3 className="panel-title">Overall Data Quality Score</h3>
        <div className="score-visualization">
          <svg className="score-circle" viewBox="0 0 160 160">
            <circle
              className="score-circle-bg"
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="var(--color-glass-medium)"
              strokeWidth="12"
            />
            <circle
              className="score-circle-progress"
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
            </defs>
          </svg>
          <div className="score-value">
            <span className="score-number">{overallScore}</span>
            <span className="score-label">/ 100</span>
          </div>
        </div>
        <div className="score-description">
          <div className="score-status good">Good Quality</div>
          <p className="score-text">
            Your data quality is above target. Continue monitoring for optimal performance.
          </p>
        </div>
      </div>
    );
  }

  renderIssuesList() {
    const { issues } = this.state;

    return (
      <div className="issues-list-panel glass-panel">
        <h3 className="panel-title">
          Data Quality Issues
          <span className="issues-count">{issues.length} issues found</span>
        </h3>
        <div className="issues-list">
          {issues.map((issue, index) => (
            <div 
              key={issue.id} 
              className="issue-card"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="issue-header">
                <div className="issue-type-section">
                  <span 
                    className="severity-indicator"
                    style={{ background: this.getSeverityColor(issue.severity) }}
                  />
                  <div>
                    <div className="issue-type">{issue.type}</div>
                    <div className="issue-field mono">{issue.field}</div>
                  </div>
                </div>
                <div 
                  className="issue-count-badge"
                  style={{ 
                    background: `${this.getSeverityColor(issue.severity)}20`,
                    color: this.getSeverityColor(issue.severity)
                  }}
                >
                  {issue.count} records
                </div>
              </div>
              <div className="issue-description">{issue.description}</div>
              <div className="issue-impact">
                <span className="impact-label">Impact:</span> {issue.impact}
              </div>
              <div className="issue-actions">
                <button className="btn-small btn-secondary">View Details</button>
                <button className="btn-small btn-primary">Fix Issue</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderQualityTrend() {
    const { trendData } = this.state;
    const maxScore = Math.max(...trendData.map(d => d.score));

    return (
      <div className="trend-panel glass-panel">
        <h3 className="panel-title">Quality Score Trend</h3>
        <div className="trend-chart">
          <div className="trend-grid">
            {[100, 80, 60, 40, 20].map((val, i) => (
              <div key={i} className="grid-line">
                <span className="grid-label">{val}</span>
              </div>
            ))}
          </div>
          <div className="trend-bars">
            {trendData.map((item, index) => (
              <div key={index} className="trend-column">
                <div 
                  className="trend-bar"
                  style={{ 
                    height: `${(item.score / maxScore) * 100}%`,
                    animationDelay: `${index * 80}ms`
                  }}
                >
                  <div className="trend-tooltip">{item.score}</div>
                </div>
                <div className="trend-label">{item.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  renderIssuesByType() {
    const { issuesByType } = this.state;

    return (
      <div className="issues-breakdown-panel glass-panel">
        <h3 className="panel-title">Issues by Type</h3>
        <div className="breakdown-list">
          {issuesByType.map((item, index) => (
            <div key={index} className="breakdown-item" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="breakdown-header">
                <span className="breakdown-type">{item.type}</span>
                <span className="breakdown-count">{item.count}</span>
              </div>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar"
                  style={{ 
                    width: `${item.percentage}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
              </div>
              <div className="breakdown-percentage">{item.percentage}% of total issues</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  render() {
    const { overallScore, issues, trendData, issuesByType, loading, error } = this.state;

    if (loading) {
      return (
        <div className="data-quality-container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading data quality metrics...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="data-quality-container">
          <div className="error-state">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={this.fetchDataQuality}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="data-quality-container">
        <div className="quality-header">
          <div>
            <h1 className="quality-title gradient-text">Data Quality Center</h1>
            <p className="quality-subtitle">Monitor and improve data integrity</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={this.fetchDataQuality}>
              <span>↻</span> Refresh
            </button>
            <button className="btn btn-primary">
              <span>⤓</span> Export Report
            </button>
          </div>
        </div>

        <div className="quality-grid">
          <div className="quality-sidebar">
            {this.renderQualityScore()}
            {this.renderIssuesByType()}
          </div>
          <div className="quality-main">
            {this.renderIssuesList()}
            {this.renderQualityTrend()}
          </div>
        </div>
      </div>
    );
  }
}

export default DataQualityCenter;
