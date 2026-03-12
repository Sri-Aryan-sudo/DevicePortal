import React, { Component } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './index.css';

class DrillDownView extends Component {
  renderBreadcrumb() {
    const { type, level, selectedDeviceType, selectedTeam, selectedVendor, selectedModelType, onNavigate } = this.props;

    // Category drill-down (PANEL, BOARD, STB) - SIMPLIFIED: Only Team → Devices
    if (type === 'category') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>
          
          {level === 'team' && (
            <span className="breadcrumb-item active">{selectedDeviceType} - Teams</span>
          )}

          {level === 'devices' && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('team')}>
                {selectedDeviceType} - Teams
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{selectedTeam} - Devices</span>
            </>
          )}
        </div>
      );
    }

    // Total devices drill-down
    if (type === 'total') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>
          
          {level === 'device_type' && (
            <span className="breadcrumb-item active">Total Devices - Device Types</span>
          )}

          {(level === 'team_from_total' || level === 'vendor' || level === 'model_type' || level === 'devices') && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('device_type')}>
                Total Devices - Device Types
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'team_from_total' && (
            <span className="breadcrumb-item active">{selectedDeviceType} - Teams</span>
          )}

          {(level === 'vendor' || level === 'model_type' || level === 'devices') && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('team')}>
                {selectedDeviceType} - Teams
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'vendor' && selectedTeam && (
            <span className="breadcrumb-item active">{selectedTeam} - Vendors</span>
          )}

          {(level === 'model_type' || level === 'devices') && selectedTeam && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('vendor')}>
                {selectedTeam} - Vendors
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'model_type' && selectedVendor && (
            <span className="breadcrumb-item active">{selectedVendor} - Model Types</span>
          )}

          {level === 'devices' && selectedVendor && selectedModelType && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('model_type')}>
                {selectedVendor} - Model Types
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{selectedModelType} - Devices</span>
            </>
          )}
        </div>
      );
    }

    // Vendors drill-down
    if (type === 'vendors') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">All Vendors</span>
        </div>
      );
    }

    return null;
  }

  renderDeviceTypeView() {
    const { data, devices, onDeviceTypeClick } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];
    
    const pieData = data.map((item, index) => ({
      name: item.device_type,
      value: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">Total Devices - Device Type Distribution</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} device type{data.length !== 1 ? 's' : ''} with {total} total devices
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(_, index) => onDeviceTypeClick(data[index])}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, 'All Devices')}
      </div>
    );
  }

  renderVendorOnlyView() {
    const { data, devices } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];
    
    const pieData = data.map((item, index) => ({
      name: item.vendor,
      value: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">Vendor Distribution</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} vendor{data.length !== 1 ? 's' : ''} with {total} total devices
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, 'All Devices by Vendor')}
      </div>
    );
  }

  renderTeamView() {
    const { type, data, devices, onTeamClick, selectedDeviceType } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];
    
    const pieData = data.map((item, index) => ({
      name: item.team_name,
      value: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);

    const title = type === 'total' 
      ? `${selectedDeviceType} Devices - Team Distribution`
      : `${selectedDeviceType} - Team Distribution`;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{title}</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} team{data.length !== 1 ? 's' : ''} with {total} total devices
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(_, index) => onTeamClick(data[index])}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, `All ${selectedDeviceType} Devices`)}
      </div>
    );
  }

  renderVendorView() {
    const { data, devices, onVendorClick, selectedDeviceType, selectedTeam } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];
    
    const pieData = data.map((item, index) => ({
      name: item.vendor,
      value: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{selectedDeviceType} - {selectedTeam} - Vendor Distribution</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} vendor{data.length !== 1 ? 's' : ''} with {total} total devices
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(_, index) => onVendorClick(data[index])}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, `${selectedDeviceType} Devices in ${selectedTeam}`)}
      </div>
    );
  }

  renderModelTypeView() {
    const { data, devices, onModelTypeClick, selectedDeviceType, selectedTeam, selectedVendor } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];
    
    const pieData = data.map((item, index) => ({
      name: item.model_type,
      value: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{selectedDeviceType} - {selectedTeam} - {selectedVendor} - Model Types</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} model type{data.length !== 1 ? 's' : ''} with {total} total devices
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(_, index) => onModelTypeClick(data[index])}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, `${selectedVendor} ${selectedDeviceType} Devices in ${selectedTeam}`)}
      </div>
    );
  }

  renderDevicesOnlyView() {
    const { devices, selectedDeviceType, selectedTeam, selectedVendor, selectedModelType } = this.props;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{selectedModelType} Devices</h1>
          <p className="drilldown-subtitle">
            {selectedVendor} {selectedDeviceType} in {selectedTeam}
          </p>
        </div>

        {this.renderDeviceTable(devices, `${selectedModelType} Device List`)}
      </div>
    );
  }

  renderDeviceTable(devices, title) {
    if (!devices || devices.length === 0) {
      return (
        <div className="drilldown-table-section glass-panel">
          <h3 className="table-title">{title}</h3>
          <div className="no-results">
            <p>No devices found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="drilldown-table-section glass-panel">
        <h3 className="table-title">{title} ({devices.length} devices)</h3>
        <div className="table-wrapper">
          <table className="drilldown-table">
            <thead>
              <tr>
                <th>MAC Address</th>
                <th>Model Name</th>
                <th>Model Type</th>
                <th>Device Type</th>
                <th>Vendor</th>
                <th>Team</th>
                <th>Location</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, index) => (
                <tr key={device.mac_address} style={{ animationDelay: `${index * 10}ms` }}>
                  <td className="mono">{device.mac_address}</td>
                  <td>{device.model_name || '-'}</td>
                  <td>{device.model_type || '-'}</td>
                  <td>
                    <span className="device-type-badge">{device.device_type}</span>
                  </td>
                  <td>{device.vendor || '-'}</td>
                  <td>{device.team_name || '-'}</td>
                  <td>{device.location_site || '-'}</td>
                  <td>{device.owner_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  render() {
    const { type, level, loading } = this.props;

    if (loading) {
      return (
        <div className="drilldown-view">
          {this.renderBreadcrumb()}
          <div className="drilldown-loading">
            <div className="spinner" />
            <p>Loading data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="drilldown-view">
        {this.renderBreadcrumb()}
        
        {/* Total devices drill-down */}
        {type === 'total' && level === 'device_type' && this.renderDeviceTypeView()}
        {type === 'total' && level === 'team_from_total' && this.renderTeamView()}
        
        {/* Vendors drill-down */}
        {type === 'vendors' && level === 'vendor_only' && this.renderVendorOnlyView()}
        
        {/* Category drill-down (PANEL, BOARD, STB) */}
        {type === 'category' && level === 'team' && this.renderTeamView()}
        
        {/* Shared levels */}
        {level === 'vendor' && this.renderVendorView()}
        {level === 'model_type' && this.renderModelTypeView()}
        {level === 'devices' && this.renderDevicesOnlyView()}
      </div>
    );
  }
}

export default DrillDownView;
