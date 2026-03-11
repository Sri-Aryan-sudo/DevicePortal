import React, { Component } from 'react';
import './index.css';

class UploadValidator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDragging: false,
      uploadedFile: null,
      validationResults: null,
      isValidating: false,
      uploadProgress: 0
    };
    this.fileInputRef = React.createRef();
  }

  requiredColumns = [
    'mac_address',
    'model_name',
    'model_type',
    'device_type',
    'vendor',
    'team_name'
  ];

  optionalColumns = [
    'model_alias',
    'rack',
    'location_scope',
    'location_site',
    'placement_type',
    'usage_purpose',
    'owner_name',
    'utilization_week_7',
    'utilization_week_8',
    'automation_filter',
    'infra_tickets',
    'device_repurpose'
  ];

  handleDragOver = (e) => {
    e.preventDefault();
    this.setState({ isDragging: true });
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    this.setState({ isDragging: false });
  }

  handleDrop = (e) => {
    e.preventDefault();
    this.setState({ isDragging: false });
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  processFile = (file) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      alert('Please upload a CSV or XLSX file');
      return;
    }

    this.setState({ 
      uploadedFile: file,
      isValidating: true,
      uploadProgress: 0
    });

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      this.setState(prevState => {
        if (prevState.uploadProgress >= 100) {
          clearInterval(progressInterval);
          this.validateFile(file);
          return { uploadProgress: 100 };
        }
        return { uploadProgress: prevState.uploadProgress + 10 };
      });
    }, 100);
  }

  validateFile = (file) => {
    // Simulate validation
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const missingColumns = this.requiredColumns.filter(col => !headers.includes(col));
        const foundColumns = this.requiredColumns.filter(col => headers.includes(col));
        const extraColumns = headers.filter(h => !this.requiredColumns.includes(h) && h !== '');

        const isValid = missingColumns.length === 0;

        this.setState({
          validationResults: {
            isValid,
            totalRows: lines.length - 1,
            headers,
            foundColumns,
            missingColumns,
            extraColumns,
            fileName: file.name,
            fileSize: this.formatFileSize(file.size)
          },
          isValidating: false
        });
      };
      reader.readAsText(file);
    }, 1500);
  }

  formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  resetUpload = () => {
    this.setState({
      uploadedFile: null,
      validationResults: null,
      uploadProgress: 0
    });
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = '';
    }
  }

  renderUploadZone() {
    const { isDragging } = this.state;

    return (
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={this.handleDragOver}
        onDragLeave={this.handleDragLeave}
        onDrop={this.handleDrop}
        onClick={() => this.fileInputRef.current.click()}
      >
        <div className="upload-icon">📁</div>
        <h3 className="upload-title">Drag & Drop Your File</h3>
        <p className="upload-subtitle">or click to browse</p>
        <p className="upload-formats">Supports CSV and XLSX files</p>
        <input
          ref={this.fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={this.handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  renderValidationProgress() {
    const { uploadedFile, uploadProgress, isValidating } = this.state;

    return (
      <div className="validation-progress glass-panel">
        <div className="progress-header">
          <div className="file-info">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{uploadedFile.name}</div>
              <div className="file-size">{this.formatFileSize(uploadedFile.size)}</div>
            </div>
          </div>
          {!isValidating && (
            <button className="btn-icon" onClick={this.resetUpload}>
              ×
            </button>
          )}
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>

        {isValidating && (
          <div className="validating-status">
            <div className="spinner-small" />
            <span>Validating columns...</span>
          </div>
        )}
      </div>
    );
  }

  renderValidationResults() {
    const { validationResults } = this.state;

    return (
      <div className="validation-results">
        <div className={`validation-summary glass-panel ${validationResults.isValid ? 'success' : 'error'}`}>
          <div className="summary-icon">
            {validationResults.isValid ? '✓' : '⚠'}
          </div>
          <div className="summary-content">
            <h3 className="summary-title">
              {validationResults.isValid ? 'Validation Passed!' : 'Validation Failed'}
            </h3>
            <p className="summary-message">
              {validationResults.isValid 
                ? `All required columns are present. File ready for ingestion.`
                : `${validationResults.missingColumns.length} required column(s) missing.`
              }
            </p>
          </div>
        </div>

        <div className="results-grid">
          <div className="result-card glass-panel">
            <div className="result-label">Total Rows</div>
            <div className="result-value">{validationResults.totalRows.toLocaleString()}</div>
          </div>
          <div className="result-card glass-panel">
            <div className="result-label">File Size</div>
            <div className="result-value">{validationResults.fileSize}</div>
          </div>
          <div className="result-card glass-panel">
            <div className="result-label">Columns Found</div>
            <div className="result-value">{validationResults.foundColumns.length}/{this.requiredColumns.length}</div>
          </div>
        </div>

        {validationResults.foundColumns.length > 0 && (
          <div className="columns-panel glass-panel">
            <h4 className="panel-subtitle">✓ Found Columns</h4>
            <div className="columns-list">
              {validationResults.foundColumns.map((col, index) => (
                <div key={index} className="column-badge success">
                  {col}
                </div>
              ))}
            </div>
          </div>
        )}

        {validationResults.missingColumns.length > 0 && (
          <div className="columns-panel glass-panel error">
            <h4 className="panel-subtitle">⚠ Missing Columns</h4>
            <div className="columns-list">
              {validationResults.missingColumns.map((col, index) => (
                <div key={index} className="column-badge error">
                  {col}
                </div>
              ))}
            </div>
            <div className="error-suggestion">
              Please add these columns to your file and re-upload.
            </div>
          </div>
        )}

        {validationResults.extraColumns.length > 0 && (
          <div className="columns-panel glass-panel">
            <h4 className="panel-subtitle">ℹ Additional Columns</h4>
            <div className="columns-list">
              {validationResults.extraColumns.map((col, index) => (
                <div key={index} className="column-badge info">
                  {col}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={this.resetUpload}>
            Upload Another File
          </button>
          {validationResults.isValid && (
            <button className="btn btn-primary">
              Proceed to Ingestion →
            </button>
          )}
        </div>
      </div>
    );
  }

  render() {
    const { uploadedFile, validationResults } = this.state;

    return (
      <div className="upload-validator-container">
        <div className="validator-header">
          <div>
            <h1 className="validator-title gradient-text">Manual Upload Validator</h1>
            <p className="validator-subtitle">Validate CSV/XLSX files before ingestion</p>
          </div>
        </div>

        <div className="validator-content">
          {!uploadedFile && this.renderUploadZone()}
          
          {uploadedFile && !validationResults && this.renderValidationProgress()}
          
          {validationResults && this.renderValidationResults()}

          <div className="required-columns-info glass-panel">
            <h4 className="info-title">Required Columns</h4>
            <div className="required-columns-grid">
              {this.requiredColumns.map((col, index) => (
                <div key={index} className="required-column-item">
                  <span className="column-icon">•</span>
                  <span className="mono">{col}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="required-columns-info glass-panel">
            <h4 className="info-title">Optional Columns (Recommended)</h4>
            <p style={{ fontSize: '0.9em', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              These columns are not required but provide additional device information
            </p>
            <div className="required-columns-grid">
              {this.optionalColumns.map((col, index) => (
                <div key={index} className="required-column-item">
                  <span className="column-icon" style={{ opacity: 0.5 }}>○</span>
                  <span className="mono" style={{ opacity: 0.7 }}>{col}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="schema-notes glass-panel">
            <h4 className="info-title">📋 Schema Notes</h4>
            <ul style={{ fontSize: '0.9em', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
              <li><strong>device_type</strong>: Must be one of: PANEL, BOARD, or STB</li>
              <li><strong>model_type</strong>: Original model type (will derive device_type if contains PANEL/BOARD)</li>
              <li><strong>mac_address</strong>: Format: AA:BB:CC:DD:EE:FF (must be unique)</li>
              <li><strong>utilization_week_7/8</strong>: Numeric values (0-100) representing percentage</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

export default UploadValidator;
