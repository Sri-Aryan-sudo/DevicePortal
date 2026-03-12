import React, { Component } from 'react';
import './index.css';
import { deviceAPI } from '../../services/api';

class DeviceDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      device: null,
      timeline: [],
      auditLog: [],
      loading: true,
      error: null,
      
      // Edit mode state
      isEditMode: false,
      editedFields: {},
      saving: false,
      saveSuccess: false,
      saveError: null
    };
  }

  async componentDidMount() {
    if (this.props.device) {
      await this.loadDeviceDetails(this.props.device.mac_address);
    }
  }

  async componentDidUpdate(prevProps) {
    if (this.props.device && prevProps.device?.mac_address !== this.props.device.mac_address) {
      await this.loadDeviceDetails(this.props.device.mac_address);
    }
  }

  async loadDeviceDetails(mac) {
    try {
      this.setState({ loading: true });
      const response = await deviceAPI.getDeviceByMac(mac);
      
      this.setState({
        device: response.data,
        timeline: [],
        auditLog: [],
        loading: false,
        error: null
      });
    } catch (error) {
      this.setState({ error: 'Failed to load device details', loading: false });
    }
  }

  getTimelineIcon = (type) => {
    const icons = {
      'system': '⚙',
      'assignment': '👤',
      'location': '📍',
      'status': '✓',
      'maintenance': '🔧',
      'creation': '✨'
    };
    return icons[type] || '•';
  }

  // Check if user can edit (POC or ADMIN only)
  canEdit = () => {
    const { userRole } = this.props;
    return userRole === 'POC' || userRole === 'ADMIN';
  }

  // Enter edit mode
  handleEnterEditMode = () => {
    const { device } = this.state;
    this.setState({
      isEditMode: true,
      editedFields: {
        owner_name: device.owner_name || '',
        team_name: device.team_name || '',
        usage_purpose: device.usage_purpose || '',
        placement_type: device.placement_type || '',
        location_site: device.location_site || '',
        device_repurpose: device.device_repurpose || ''
      },
      saveSuccess: false,
      saveError: null
    });
  }

  // Cancel edit mode
  handleCancelEdit = () => {
    this.setState({
      isEditMode: false,
      editedFields: {},
      saveError: null
    });
  }

  // Handle field change
  handleFieldChange = (field, value) => {
    this.setState(prevState => ({
      editedFields: {
        ...prevState.editedFields,
        [field]: value
      }
    }));
  }

  // Save changes
  handleSaveChanges = async () => {
    const { device, editedFields } = this.state;
    const { authToken } = this.props;
    
    try {
      this.setState({ saving: true, saveError: null });

      const response = await deviceAPI.updateDeviceByPOC(
        device.mac_address,
        editedFields,
        authToken
      );

      // Update device state with new data
      this.setState({
        device: response.data.device,
        isEditMode: false,
        saving: false,
        saveSuccess: true,
        saveError: null
      });

      // Hide success message after 3 seconds
      setTimeout(() => {
        this.setState({ saveSuccess: false });
      }, 3000);

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save changes';
      this.setState({
        saving: false,
        saveError: errorMessage
      });
    }
  }

  renderHeroCard() {
    const { device } = this.state;
    if (!device) return null;

    return (
      <div className="hero-card glass-panel">
        <div className="hero-header">
          <div className="hero-title-section">
            <div className="device-type-tag">{device.device_type}</div>
            <h1 className="hero-device-id gradient-text">{device.mac_address}</h1>
            <p className="hero-model">{device.model_name}</p>
            {device.model_type && <p className="hero-model-type">{device.model_type}</p>}
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <div className="metric-label">Utilization (Week 7)</div>
            <div className="metric-value">{device.utilization_week_7 || 0}%</div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill"
                style={{ width: `${device.utilization_week_7 || 0}%` }}
              />
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Utilization (Week 8)</div>
            <div className="metric-value">{device.utilization_week_8 || 0}%</div>
            <div className="metric-bar">
              <div 
                className="metric-bar-fill success"
                style={{ width: `${device.utilization_week_8 || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hero-details">
          <div className="detail-row">
            <span className="detail-label">MAC Address</span>
            <span className="detail-value mono">{device.mac_address}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vendor</span>
            <span className="detail-value">{device.vendor}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Model Alias</span>
            <span className="detail-value">{device.model_alias}</span>
          </div>
          {device.model_type && (
            <div className="detail-row">
              <span className="detail-label">Model Type</span>
              <span className="detail-value">{device.model_type}</span>
            </div>
          )}
          
          {/* Editable Fields */}
          {this.renderEditableField('Owner', 'owner_name', device.owner_name || 'Unassigned')}
          {this.renderEditableField('Team', 'team_name', device.team_name)}
          {this.renderEditableField('Location', 'location_site', device.location_site)}
          {this.renderEditableField('Placement Type', 'placement_type', device.placement_type)}
          {this.renderEditableField('Usage Purpose', 'usage_purpose', device.usage_purpose)}
          {this.renderEditableField('Device Repurpose', 'device_repurpose', device.device_repurpose)}
          
          <div className="detail-row">
            <span className="detail-label">Rack</span>
            <span className="detail-value">{device.rack}</span>
          </div>
        </div>

        {/* Edit/Save buttons */}
        {this.renderEditButtons()}
      </div>
    );
  }

  // Render editable field based on edit mode
  renderEditableField(label, fieldName, value) {
    const { isEditMode, editedFields } = this.state;

    return (
      <div className="detail-row">
        <span className="detail-label">{label}</span>
        {isEditMode ? (
          <input
            type="text"
            className="detail-input"
            value={editedFields[fieldName] || ''}
            onChange={(e) => this.handleFieldChange(fieldName, e.target.value)}
          />
        ) : (
          <span className="detail-value">{value || '-'}</span>
        )}
      </div>
    );
  }

  // Render edit/save/cancel buttons
  renderEditButtons() {
    const { isEditMode, saving, saveSuccess, saveError } = this.state;

    if (!this.canEdit()) {
      return null; // VIEWER users don't see edit button
    }

    return (
      <div className="edit-actions">
        {saveSuccess && (
          <div className="save-success-message">
            ✓ Changes saved successfully!
          </div>
        )}
        {saveError && (
          <div className="save-error-message">
            ✗ {saveError}
          </div>
        )}
        
        {isEditMode ? (
          <div className="edit-buttons">
            <button 
              className="btn-save" 
              onClick={this.handleSaveChanges}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button 
              className="btn-cancel" 
              onClick={this.handleCancelEdit}
              disabled={saving}
            >
              ✕ Cancel
            </button>
          </div>
        ) : (
          <button className="btn-edit" onClick={this.handleEnterEditMode}>
            ✏️ Edit Device
          </button>
        )}
      </div>
    );
  }

  renderTimeline() {
    const { timeline } = this.state;

    return (
      <div className="timeline-panel glass-panel">
        <h3 className="panel-title">Assignment Timeline</h3>
        <div className="timeline">
          {timeline.map((item, index) => (
            <div key={index} className="timeline-item" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="timeline-marker">
                <span className="timeline-icon">{this.getTimelineIcon(item.type)}</span>
              </div>
              <div className="timeline-content">
                <div className="timeline-event">{item.event}</div>
                <div className="timeline-meta">
                  {item.date} • {item.user}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderAuditLog() {
    const { auditLog } = this.state;

    return (
      <div className="audit-panel glass-panel">
        <h3 className="panel-title">Audit Log</h3>
        <div className="audit-table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((log, index) => (
                <tr key={index} style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="mono">{log.timestamp}</td>
                  <td>
                    <span className="action-badge">{log.action}</span>
                  </td>
                  <td className="mono">{log.field}</td>
                  <td className="old-value">{log.oldValue}</td>
                  <td className="new-value">{log.newValue}</td>
                  <td className="mono">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  render() {
    const { device, loading, error } = this.state;

    if (loading) {
      return (
        <div className="device-detail-container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading device details...</p>
          </div>
        </div>
      );
    }

    if (error || !device) {
      return (
        <div className="device-detail-container">
          <div className="error-state">
            <p>{error || 'Device not found'}</p>
            <button className="btn btn-primary" onClick={() => window.history.back()}>
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="device-detail-container">
        <div className="detail-header">
          <button 
            className="btn btn-secondary back-btn" 
            onClick={this.props.onBack || (() => window.history.back())}
          >
            ← Back to Explorer
          </button>
          <div className="header-actions">
            <button className="btn btn-secondary">Edit Device</button>
            <button className="btn btn-primary">Export Details</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-main">
            {this.renderHeroCard()}
            {this.renderTimeline()}
          </div>
          <div className="detail-sidebar">
            <div className="location-viz glass-panel">
              <h3 className="panel-title">Location Visualization</h3>
              <div className="location-map">
                <div className="building-layout">
                  <div className="lab-section lab-a active">
                    <span className="lab-label">Lab A</span>
                    <div className="rack-indicator">
                      <div className="rack active">R1</div>
                      <div className="rack">R2</div>
                      <div className="rack highlight">R3</div>
                    </div>
                  </div>
                  <div className="lab-section lab-b">
                    <span className="lab-label">Lab B</span>
                    <div className="rack-indicator">
                      <div className="rack">R1</div>
                      <div className="rack">R2</div>
                      <div className="rack">R3</div>
                    </div>
                  </div>
                  <div className="lab-section lab-c">
                    <span className="lab-label">Lab C</span>
                    <div className="rack-indicator">
                      <div className="rack">R1</div>
                      <div className="rack">R2</div>
                    </div>
                  </div>
                </div>
                <div className="location-info">
                  <div className="location-detail">
                    <span className="location-icon">🏢</span>
                    <span>{device.building}</span>
                  </div>
                  <div className="location-detail">
                    <span className="location-icon">📍</span>
                    <span>{device.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-full-width">
          {this.renderAuditLog()}
        </div>
      </div>
    );
  }
}

export default DeviceDetail;
