import React, { Component } from 'react';
import './index.css';

class CSVIngestion extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      uploading: false,
      uploadSuccess: false,
      uploadError: null,
      uploadResult: null
    };
    
    this.fileInputRef = React.createRef();
  }

  handleFileSelect = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        this.setState({
          uploadError: 'Please select a CSV or XLSX file',
          selectedFile: null
        });
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        this.setState({
          uploadError: 'File exceeds 50 MB limit',
          selectedFile: null
        });
        return;
      }
      
      this.setState({
        selectedFile: file,
        uploadError: null,
        uploadSuccess: false,
        uploadResult: null
      });
    }
  }

  handleUpload = async () => {
    const { selectedFile } = this.state;
    
    if (!selectedFile) {
      this.setState({ uploadError: 'Please select a file first' });
      return;
    }
    
    this.setState({ 
      uploading: true, 
      uploadError: null,
      uploadSuccess: false,
      uploadResult: null
    });
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      // Get auth token
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        this.setState({
          uploading: false,
          uploadError: 'Not authenticated. Please log in again.',
          uploadSuccess: false
        });
        return;
      }

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        this.setState({
          uploading: false,
          uploadSuccess: true,
          uploadResult: result,
          selectedFile: null,
          uploadError: null
        });
        
        // Clear file input
        if (this.fileInputRef.current) {
          this.fileInputRef.current.value = '';
        }
        
        // Notify parent to refresh data
        if (this.props.onUploadSuccess) {
          this.props.onUploadSuccess();
        }
        
      } else {
        let errorMsg = result.error || result.message || 'Upload failed';
        if (result.details) errorMsg += '\n' + result.details;
        if (result.hint) errorMsg += '\n' + result.hint;
        this.setState({
          uploading: false,
          uploadError: errorMsg,
          uploadSuccess: false
        });
      }
      
    } catch (error) {
      this.setState({
        uploading: false,
        uploadError: error.message || 'Failed to connect to server. Please check that the backend is running.',
        uploadSuccess: false
      });
    }
  }

  handleClearFile = () => {
    this.setState({
      selectedFile: null,
      uploadError: null,
      uploadSuccess: false,
      uploadResult: null
    });
    
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = '';
    }
  }

  formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  renderColumnWarning() {
    const { uploadResult } = this.state;
    if (!uploadResult || !uploadResult.columnInfo) return null;

    const { recognized, unrecognized } = uploadResult.columnInfo;
    if (!unrecognized || unrecognized.length === 0) return null;

    return (
      <div className="alert alert-warning" style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div className="alert-content">
          <strong>⚠️ Unrecognized Columns Ignored</strong>
          <p style={{ margin: '8px 0 4px' }}>
            The following column headers were not recognized and their data was skipped:
          </p>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {unrecognized.map((col, i) => (
              <li key={i} style={{ color: '#856404' }}>{col}</li>
            ))}
          </ul>
          <p style={{ margin: '8px 0 0', fontSize: '0.85em', color: '#856404' }}>
            Recognized columns ({recognized.length}): {recognized.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  renderUploadSummary() {
    const { uploadResult } = this.state;
    if (!uploadResult) return null;

    const {
      totalRows = 0,
      validRows = 0,
      invalidRows = 0,
      inserted = 0,
      updated = 0,
      errors = 0
    } = uploadResult;

    const skipped = validRows - inserted - updated - errors;

    return (
      <div className="upload-summary glass-panel">
        <h3>📊 Upload Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Rows</span>
            <span className="summary-value">{totalRows}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Valid Rows</span>
            <span className="summary-value summary-valid">{validRows}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Invalid Rows</span>
            <span className="summary-value summary-invalid">{invalidRows}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Inserted</span>
            <span className="summary-value summary-inserted">{inserted}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Updated</span>
            <span className="summary-value summary-updated">{updated}</span>
          </div>
          {skipped > 0 && (
            <div className="summary-item">
              <span className="summary-label">Skipped (no changes)</span>
              <span className="summary-value summary-skipped">{skipped}</span>
            </div>
          )}
          {errors > 0 && (
            <div className="summary-item">
              <span className="summary-label">Errors</span>
              <span className="summary-value summary-errors">{errors}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  renderErrors() {
    const { uploadResult } = this.state;
    if (!uploadResult) return null;

    const { invalidDevices, insertErrors } = uploadResult;
    const hasInvalid = invalidDevices && invalidDevices.length > 0;
    const hasInsertErrors = insertErrors && insertErrors.length > 0;

    if (!hasInvalid && !hasInsertErrors) return null;

    return (
      <div className="errors-panel glass-panel">
        {hasInvalid && (
          <>
            <h3>⚠️ Validation Errors</h3>
            <div className="errors-list">
              {invalidDevices.map((item, index) => (
                <div key={`invalid-${index}`} className="error-item">
                  <strong>Row {item.row}:</strong>{' '}
                  {item.validation
                    ? item.validation.errors.join(', ')
                    : item.errors
                    ? item.errors.join(', ')
                    : 'Invalid data'}
                </div>
              ))}
            </div>
          </>
        )}
        {hasInsertErrors && (
          <>
            <h3>❌ Database Errors</h3>
            <div className="errors-list">
              {insertErrors.map((item, index) => (
                <div key={`insert-${index}`} className="error-item">
                  <strong>Row {item.row} (MAC: {item.mac}):</strong> {item.error}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  render() {
    const { 
      selectedFile, 
      uploading, 
      uploadSuccess, 
      uploadError, 
      uploadResult 
    } = this.state;

    return (
      <div className="csv-ingestion-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">CSV Ingestion</h1>
            <p className="page-subtitle">Upload device data from CSV files</p>
          </div>
        </div>

        {uploadSuccess && uploadResult && (
          <div className="alert alert-success">
            <div className="alert-icon">✓</div>
            <div className="alert-content">
              <strong>Upload Successful!</strong>
              <div className="upload-stats">
                {uploadResult.inserted > 0 && (
                  <span className="stat">
                    <strong>{uploadResult.inserted}</strong> devices added
                  </span>
                )}
                {uploadResult.updated > 0 && (
                  <span className="stat">
                    <strong>{uploadResult.updated}</strong> devices updated
                  </span>
                )}
                {uploadResult.errors > 0 && (
                  <span className="stat error">
                    <strong>{uploadResult.errors}</strong> errors
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <strong>Upload Failed</strong>
              {uploadError.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {this.renderColumnWarning()}

        <div className="upload-panel glass-panel">
          <div className="upload-instructions">
            <h3>📄 Upload CSV File</h3>
            <p>Select a CSV file containing device data to upload to the system.</p>
            <div className="requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>File must be in CSV or XLSX format</li>
                <li>Must contain: mac_address, model_name, model_type, device_type, vendor, team_name</li>
                <li>MAC address format: XX:XX:XX:XX:XX:XX</li>
                <li>Maximum file size: 50MB</li>
              </ul>
            </div>
          </div>

          <div className="upload-section">
            <div className="file-input-wrapper">
              <input
                ref={this.fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={this.handleFileSelect}
                className="file-input"
                id="csv-file-input"
                disabled={uploading}
              />
              <label htmlFor="csv-file-input" className="file-input-label">
                <span className="file-icon">📁</span>
                <span>Choose CSV File</span>
              </label>
            </div>

            {selectedFile && (
              <div className="selected-file">
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">
                      {this.formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                </div>
                <button
                  className="btn-clear-file"
                  onClick={this.handleClearFile}
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
            )}

            <div className="upload-actions">
              <button
                className="btn btn-primary btn-upload"
                onClick={this.handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <span className="spinner-small"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>⬆️</span>
                    Upload to Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {this.renderUploadSummary()}
        {this.renderErrors()}

        <div className="help-panel glass-panel">
          <h3>ℹ️ How to Use</h3>
          <ol>
            <li>Prepare your CSV file with device data</li>
            <li>Click "Choose CSV File" and select your file</li>
            <li>Click "Upload to Database" to process the file</li>
            <li>Review the upload results and any errors</li>
          </ol>
          <p className="note">
            <strong>Note:</strong> Uploaded data will appear in Dashboard and Device Explorer immediately.
          </p>
        </div>
      </div>
    );
  }
}

export default CSVIngestion;
