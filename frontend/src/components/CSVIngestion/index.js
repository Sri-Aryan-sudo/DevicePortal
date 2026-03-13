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
      if (!file.name.endsWith('.csv')) {
        this.setState({
          uploadError: 'Please select a CSV file',
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
      uploadSuccess: false 
    });
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await fetch('http://localhost:5001/ingest', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
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
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          this.setState({ uploadSuccess: false });
        }, 5000);
        
      } else {
        this.setState({
          uploading: false,
          uploadError: result.error || 'Upload failed',
          uploadSuccess: false
        });
      }
      
    } catch (error) {
      this.setState({
        uploading: false,
        uploadError: error.message || 'Failed to connect to ingestion server',
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
                {uploadResult.inserted && (
                  <span className="stat">
                    <strong>{uploadResult.inserted}</strong> devices added
                  </span>
                )}
                {uploadResult.updated && (
                  <span className="stat">
                    <strong>{uploadResult.updated}</strong> devices updated
                  </span>
                )}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <span className="stat error">
                    <strong>{uploadResult.errors.length}</strong> errors
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
              <p>{uploadError}</p>
            </div>
          </div>
        )}

        <div className="upload-panel glass-panel">
          <div className="upload-instructions">
            <h3>📄 Upload CSV File</h3>
            <p>Select a CSV file containing device data to upload to the system.</p>
            <div className="requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>File must be in CSV format (.csv)</li>
                <li>Must contain valid device data columns</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
          </div>

          <div className="upload-section">
            <div className="file-input-wrapper">
              <input
                ref={this.fileInputRef}
                type="file"
                accept=".csv"
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

        {uploadResult && uploadResult.errors && uploadResult.errors.length > 0 && (
          <div className="errors-panel glass-panel">
            <h3>⚠️ Upload Errors ({uploadResult.errors.length})</h3>
            <div className="errors-list">
              {uploadResult.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="error-item">
                  <strong>Row {error.row || index + 1}:</strong> {error.message}
                </div>
              ))}
              {uploadResult.errors.length > 10 && (
                <div className="error-item">
                  ... and {uploadResult.errors.length - 10} more errors
                </div>
              )}
            </div>
          </div>
        )}

        <div className="help-panel glass-panel">
          <h3>ℹ️ How to Use</h3>
          <ol>
            <li>Prepare your CSV file with device data</li>
            <li>Click "Choose CSV File" and select your file</li>
            <li>Click "Upload to Database" to process the file</li>
            <li>Review the upload results and any errors</li>
          </ol>
          <p className="note">
            <strong>Note:</strong> The ingestion service must be running on port 5001
          </p>
        </div>
      </div>
    );
  }
}

export default CSVIngestion;
