import React, { Component } from 'react';
import './index.css';
import { nlQueryAPI } from '../../services/api';

const EXAMPLE_QUERIES = [
  'Show all Sharp panels',
  'List all devices currently with WebApps',
  'How many boards are there in each team?',
  'Show all devices with no current user assigned',
  'List all Pioneer panels in Bangalore',
  'Show all devices belonging to the OTT team',
  'How many devices are currently available?',
  'Show devices with utilization greater than 80%',
  'Show all devices owned by the Middleware team',
  'List all XUMO devices',
];

const PAGE_SIZE = 50;

class NLQuery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      question: '',
      conversations: [], // [{ question, summary, result, error }]
      loading: false,
      showSQL: false,
      currentPage: 1,
    };
    this.inputRef = React.createRef();
    this.bottomRef = React.createRef();
  }

  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  buildHistory() {
    // Send last 5 exchanges (10 turns) to backend for conversation context
    const { conversations } = this.state;
    const history = [];
    for (const conv of conversations.slice(-5)) {
      history.push({ role: 'user', content: conv.question });
      if (conv.result?.sql) {
        history.push({ role: 'assistant', content: conv.result.sql });
      } else {
        history.push({ role: 'assistant', content: 'No result' });
      }
    }
    return history;
  }

  handleSubmit = async (e) => {
    e?.preventDefault();
    const { question } = this.state;
    const trimmed = question.trim();
    if (!trimmed || this.state.loading) return;

    const history = this.buildHistory();

    this.setState({ loading: true, question: '', currentPage: 1, showSQL: false });

    try {
      const token = this.getAuthToken();
      const response = await nlQueryAPI.ask(trimmed, history, token);
      const result = response.data;

      this.setState(prev => ({
        conversations: [...prev.conversations, {
          question: trimmed,
          summary: result.summary,
          result,
          error: null,
        }],
        loading: false,
        currentPage: 1,
      }));
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to process your query. Please try again.';
      this.setState(prev => ({
        conversations: [...prev.conversations, {
          question: trimmed,
          summary: null,
          result: null,
          error: errorMsg,
        }],
        loading: false,
      }));
    }

    setTimeout(() => this.bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handleExampleClick = (q) => {
    this.setState({ question: q }, () => this.inputRef.current?.focus());
  };

  handleClear = () => {
    this.setState({ conversations: [], question: '', currentPage: 1, showSQL: false });
  };

  downloadCSV = (result) => {
    if (!result || result.rows.length === 0) return;
    const header = result.columns.join(',');
    const rows = result.rows.map(row =>
      result.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-query-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  renderHistory() {
    const { conversations } = this.state;
    if (conversations.length <= 1) return null;
    const history = conversations.slice(0, -1);
    return (
      <div className="nlq-history">
        {history.map((conv, i) => (
          <div key={i} className="nlq-history-item">
            <div className="nlq-history-q">
              <span className="nlq-bubble-icon">💬</span>
              <span>{conv.question}</span>
            </div>
            <div className="nlq-history-a">
              <span className="nlq-bubble-icon">🤖</span>
              <span className={conv.error ? 'nlq-error-text' : ''}>
                {conv.error || conv.summary}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  renderResultTable(result) {
    const { showSQL, currentPage } = this.state;
    const totalPages = Math.ceil(result.rows.length / PAGE_SIZE);
    const pagedRows = result.rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const hasMAC = result.columns.includes('mac_address');

    return (
      <>
        <div className="nlq-table-actions">
          <button className="nlq-btn-secondary" onClick={() => this.downloadCSV(result)}>
            ⬇ Download CSV
          </button>
          <button className="nlq-btn-secondary" onClick={() => this.setState(p => ({ showSQL: !p.showSQL }))}>
            {showSQL ? '▲ Hide SQL' : '▼ View SQL'}
          </button>
        </div>

        {showSQL && (
          <div className="nlq-sql-box">
            <code>{result.sql}</code>
          </div>
        )}

        <div className="table-wrapper">
          <table className="drilldown-table">
            <thead>
              <tr>
                {result.columns.map(col => <th key={col}>{col}</th>)}
                {hasMAC && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, i) => (
                <tr key={i} style={{ animationDelay: `${Math.min(i, 30) * 5}ms` }}>
                  {result.columns.map(col => {
                    const val = row[col];
                    if (col === 'device_type' && val) {
                      return <td key={col}><span className="device-type-badge">{val}</span></td>;
                    }
                    return (
                      <td key={col} title={val != null ? String(val) : ''} className={col === 'mac_address' ? 'mono' : ''}>
                        {val != null ? String(val) : '—'}
                      </td>
                    );
                  })}
                  {hasMAC && (
                    <td>
                      <button
                        className="btn-view-device"
                        onClick={() => this.props.onDeviceSelect && this.props.onDeviceSelect(row)}
                        title="View device details"
                      >
                        View →
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="nlq-pagination">
            <button
              className="nlq-btn-secondary"
              disabled={currentPage === 1}
              onClick={() => this.setState(p => ({ currentPage: p.currentPage - 1 }))}
            >← Prev</button>
            <span>Page {currentPage} of {totalPages} ({result.rows.length} total)</span>
            <button
              className="nlq-btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => this.setState(p => ({ currentPage: p.currentPage + 1 }))}
            >Next →</button>
          </div>
        )}
      </>
    );
  }

  renderCurrentResult() {
    const { conversations, showSQL } = this.state;
    if (conversations.length === 0) return null;
    const latest = conversations[conversations.length - 1];

    return (
      <div className="nlq-result-area">
        <div className="nlq-current-q">
          <span className="nlq-bubble-icon">💬</span>
          <span>{latest.question}</span>
        </div>

        {latest.error ? (
          <div className="nlq-error-card">
            <span>⚠️</span> {latest.error}
          </div>
        ) : latest.result ? (() => {
          const { result } = latest;
          const isSingleAggregate = result.rows.length === 1 && result.columns.length === 1 &&
            !isNaN(Object.values(result.rows[0])[0]);

          return (
            <>
              <div className="nlq-summary-card">
                <span className="nlq-bubble-icon">🤖</span>
                <div>
                  <div className="nlq-summary-text">{result.summary}</div>
                  {result.truncated && (
                    <div className="nlq-truncated-notice">
                      ⚠ Showing first 500 results. Refine your question to narrow down.
                    </div>
                  )}
                </div>
              </div>

              {isSingleAggregate ? (
                <div className="nlq-stat-card">
                  <div className="nlq-stat-value">
                    {Number(Object.values(result.rows[0])[0]).toLocaleString()}
                  </div>
                  <div className="nlq-stat-label">{result.columns[0]}</div>
                  <button
                    className="nlq-btn-secondary nlq-stat-sql-btn"
                    onClick={() => this.setState(p => ({ showSQL: !p.showSQL }))}
                  >
                    {showSQL ? '▲ Hide SQL' : '▼ View SQL'}
                  </button>
                  {showSQL && <div className="nlq-sql-box nlq-sql-box-stat"><code>{result.sql}</code></div>}
                </div>
              ) : result.rows.length === 0 ? (
                <div className="nlq-empty-state">
                  <div>No results matched your query.</div>
                  <button
                    className="nlq-btn-secondary"
                    onClick={() => this.setState(p => ({ showSQL: !p.showSQL }))}
                  >
                    {showSQL ? '▲ Hide SQL' : '▼ View generated SQL'}
                  </button>
                  {showSQL && <div className="nlq-sql-box"><code>{result.sql}</code></div>}
                </div>
              ) : (
                this.renderResultTable(result)
              )}
            </>
          );
        })() : null}
      </div>
    );
  }

  render() {
    const { question, conversations, loading } = this.state;

    return (
      <div className="nlq-container">
        <div className="nlq-header">
          <div>
            <h1 className="nlq-title gradient-text">AI Device Assistant</h1>
            <p className="nlq-subtitle">Ask questions about your device inventory in plain English</p>
          </div>
          {conversations.length > 0 && (
            <button className="nlq-btn-secondary nlq-clear-btn" onClick={this.handleClear}>
              🗑 New Conversation
            </button>
          )}
        </div>

        {conversations.length === 0 && !loading && (
          <div className="nlq-examples glass-panel">
            <p className="nlq-examples-label">Try asking:</p>
            <div className="nlq-examples-grid">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button key={i} className="nlq-example-chip" onClick={() => this.handleExampleClick(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {this.renderHistory()}
        {this.renderCurrentResult()}

        {loading && (
          <div className="nlq-loading">
            <div className="spinner" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={this.bottomRef} />

        <div className="nlq-input-area">
          <form className="nlq-form" onSubmit={this.handleSubmit}>
            <textarea
              ref={this.inputRef}
              className="nlq-input"
              value={question}
              onChange={e => this.setState({ question: e.target.value })}
              onKeyDown={this.handleKeyDown}
              placeholder="Ask anything about your devices...  (Enter to send, Shift+Enter for new line)"
              rows={2}
              maxLength={500}
              disabled={loading}
            />
            <button
              type="submit"
              className="nlq-send-btn"
              disabled={!question.trim() || loading}
            >
              {loading ? '...' : 'Ask →'}
            </button>
          </form>
          {question.length > 0 && (
            <div className="nlq-char-count">{question.length} / 500</div>
          )}
        </div>
      </div>
    );
  }
}

export default NLQuery;
