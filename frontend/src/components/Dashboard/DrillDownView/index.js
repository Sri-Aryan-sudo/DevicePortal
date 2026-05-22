import React, { Component } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './index.css';

class DrillDownView extends Component {
  renderBreadcrumb() {
    const { type, level, selectedDeviceType, selectedTeam, selectedVendor, selectedModelType, onNavigate } = this.props;

    // Category drill-down (PANEL, BOARD, STB): Vendor → Model → Team → Devices
    if (type === 'category') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>

          {level === 'vendor' && (
            <span className="breadcrumb-item active">{selectedDeviceType} - Vendors</span>
          )}

          {(level === 'model_type' || level === 'team' || level === 'devices') && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('vendor')}>
                {selectedDeviceType} - Vendors
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'model_type' && (
            <span className="breadcrumb-item active">{selectedVendor} - Models</span>
          )}

          {(level === 'team' || level === 'devices') && selectedVendor && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('model_type')}>
                {selectedVendor} - Models
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'team' && (
            <span className="breadcrumb-item active">{selectedModelType} - Teams</span>
          )}

          {level === 'devices' && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('team')}>
                {selectedModelType} - Teams
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{selectedTeam} - Devices</span>
            </>
          )}
        </div>
      );
    }

    // Total devices drill-down: Vendor → Model → Team → Devices
    if (type === 'total') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>

          {level === 'vendor' && (
            <span className="breadcrumb-item active">Total Devices - Vendors</span>
          )}

          {(level === 'model_type' || level === 'team' || level === 'devices') && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('vendor')}>
                Total Devices - Vendors
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'model_type' && selectedVendor && (
            <span className="breadcrumb-item active">{selectedVendor} - Models</span>
          )}

          {(level === 'team' || level === 'devices') && selectedVendor && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('model_type')}>
                {selectedVendor} - Models
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'team' && selectedModelType && (
            <span className="breadcrumb-item active">{selectedModelType} - Teams</span>
          )}

          {level === 'devices' && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('team')}>
                {selectedModelType} - Teams
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{selectedTeam} - Devices</span>
            </>
          )}
        </div>
      );
    }

    // Vendors tile drill-down (read-only vendor list)
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

    // Placement Types drill-down: Placement Types → Vendors → Models → Teams → Devices
    if (type === 'placement_types') {
      return (
        <div className="breadcrumb">
          <button className="breadcrumb-item" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </button>
          <span className="breadcrumb-separator">/</span>

          {level === 'placement_type' && (
            <span className="breadcrumb-item active">Placement Types</span>
          )}

          {(level === 'vendor' || level === 'model_type' || level === 'team' || level === 'devices') && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('placement_type')}>
                Placement Types
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'vendor' && (
            <span className="breadcrumb-item active">{this.props.selectedPlacementType} - Vendors</span>
          )}

          {(level === 'model_type' || level === 'team' || level === 'devices') && selectedVendor && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('vendor')}>
                {this.props.selectedPlacementType} - Vendors
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'model_type' && selectedVendor && (
            <span className="breadcrumb-item active">{selectedVendor} - Models</span>
          )}

          {(level === 'team' || level === 'devices') && selectedVendor && selectedModelType && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('model_type')}>
                {selectedVendor} - Models
              </button>
              <span className="breadcrumb-separator">/</span>
            </>
          )}

          {level === 'team' && selectedModelType && (
            <span className="breadcrumb-item active">{selectedModelType} - Teams</span>
          )}

          {level === 'devices' && (
            <>
              <button className="breadcrumb-item" onClick={() => onNavigate('team')}>
                {selectedModelType} - Teams
              </button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{selectedTeam} - Devices</span>
            </>
          )}
        </div>
      );
    }

    return null;
  }

  renderDeviceTypeView() {
    const { data, devices, onDeviceTypeClick } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];

    const barData = data.map((item, index) => ({
      name: item.device_type,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(300, data.length * 50);

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
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    const index = barData.findIndex(d => d.name === e.activePayload[0].payload.name);
                    if (index >= 0) onDeviceTypeClick(data[index]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Devices']} cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
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

    const barData = data.map((item, index) => ({
      name: item.vendor,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(300, data.length * 40);

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
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Devices']} cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {this.renderDeviceTable(devices, 'All Devices by Vendor')}
      </div>
    );
  }

  // Vendor list view: shown after clicking a KPI tile (first drill-down level)
  renderVendorView() {
    const { type, data, onVendorClick, selectedDeviceType } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];

    const barData = data.map((item, index) => ({
      name: item.vendor,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(300, data.length * 40);

    const title = type === 'total'
      ? 'Total Devices - Vendor Distribution'
      : type === 'placement_types'
      ? `${this.props.selectedPlacementType} - Vendor Distribution`
      : `${selectedDeviceType} - Vendor Distribution`;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{title}</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} vendor{data.length !== 1 ? 's' : ''} with {total} total devices.
            Click a bar to explore model types.
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    const index = barData.findIndex(d => d.name === e.activePayload[0].payload.name);
                    if (index >= 0) onVendorClick(data[index]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Devices']} cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clickable vendor cards below chart */}
        <div className="drilldown-table-section glass-panel">
          <h3 className="table-title">Vendors ({data.length})</h3>
          <div className="table-wrapper">
            <table className="drilldown-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Device Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.vendor} style={{ animationDelay: `${index * 10}ms` }}>
                    <td title={item.vendor}>{item.vendor}</td>
                    <td>{parseInt(item.count).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-view-device"
                        onClick={() => onVendorClick(item)}
                        title="Explore model types"
                      >
                        Explore →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Model type list view: shown after clicking a vendor
  renderModelTypeView() {
    const { type, data, onModelTypeClick, selectedDeviceType, selectedVendor } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];

    const barData = data.map((item, index) => ({
      name: item.model_type,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(400, data.length * 40);

    const title = type === 'total' || type === 'placement_types'
      ? `${selectedVendor} - Model Types`
      : `${selectedDeviceType} / ${selectedVendor} - Model Types`;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{title}</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} model type{data.length !== 1 ? 's' : ''} with {total} total devices.
            Click a bar to see team breakdown.
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    const index = barData.findIndex(d => d.name === e.activePayload[0].payload.name);
                    if (index >= 0) onModelTypeClick(data[index]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [value.toLocaleString(), 'Devices']}
                  cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clickable model type table */}
        <div className="drilldown-table-section glass-panel">
          <h3 className="table-title">Model Types ({data.length})</h3>
          <div className="table-wrapper">
            <table className="drilldown-table">
              <thead>
                <tr>
                  <th>Model Type</th>
                  <th>Device Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.model_type} style={{ animationDelay: `${index * 10}ms` }}>
                    <td title={item.model_type}>{item.model_type}</td>
                    <td>{parseInt(item.count).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-view-device"
                        onClick={() => onModelTypeClick(item)}
                        title="View team breakdown"
                      >
                        Explore →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Team list view: shown after clicking a model type
  renderTeamView() {
    const { type, data, onTeamClick, selectedDeviceType, selectedVendor, selectedModelType } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];

    const barData = data.map((item, index) => ({
      name: item.team_name,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(300, data.length * 40);

    const title = type === 'total' || type === 'placement_types'
      ? `${selectedVendor} / ${selectedModelType} - Team Distribution`
      : `${selectedDeviceType} / ${selectedVendor} / ${selectedModelType} - Team Distribution`;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{title}</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} team{data.length !== 1 ? 's' : ''} with {total} total devices.
            Click a bar to view individual devices.
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    const index = barData.findIndex(d => d.name === e.activePayload[0].payload.name);
                    if (index >= 0) onTeamClick(data[index]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Devices']} cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clickable team table */}
        <div className="drilldown-table-section glass-panel">
          <h3 className="table-title">Teams ({data.length})</h3>
          <div className="table-wrapper">
            <table className="drilldown-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Device Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.team_name} style={{ animationDelay: `${index * 10}ms` }}>
                    <td title={item.team_name}>{item.team_name}</td>
                    <td>{parseInt(item.count).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-view-device"
                        onClick={() => onTeamClick(item)}
                        title="View devices for this team"
                      >
                        View Devices →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Final devices view: shown after clicking a team
  renderDevicesOnlyView() {
    const { devices, selectedDeviceType, selectedTeam, selectedVendor, selectedModelType, type } = this.props;

    const title = type === 'total' || type === 'placement_types'
      ? `${selectedVendor} / ${selectedModelType} / ${selectedTeam} - Devices`
      : `${selectedDeviceType} / ${selectedVendor} / ${selectedModelType} / ${selectedTeam} - Devices`;

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">{title}</h1>
          <p className="drilldown-subtitle">
            All {selectedModelType} devices assigned to {selectedTeam}
          </p>
        </div>

        {this.renderDeviceTable(devices, `${selectedModelType} Device List`)}
      </div>
    );
  }

  // Placement type list view: shown after clicking Placement Types tile
  renderPlacementTypeListView() {
    const { data, onPlacementTypeClick } = this.props;

    const COLORS = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b', '#fa709a', '#00f2fe'];

    const barData = data.map((item, index) => ({
      name: item.placement_type,
      count: parseInt(item.count),
      fill: COLORS[index % COLORS.length]
    }));

    const total = data.reduce((sum, item) => sum + parseInt(item.count), 0);
    const chartHeight = Math.max(300, data.length * 40);

    return (
      <div className="drilldown-content">
        <div className="drilldown-header">
          <h1 className="drilldown-title gradient-text">Placement Type Distribution</h1>
          <p className="drilldown-subtitle">
            Showing {data.length} placement type{data.length !== 1 ? 's' : ''} with {total} total devices.
            Click a bar to explore vendors.
          </p>
        </div>

        <div className="drilldown-chart-section">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    const index = barData.findIndex(d => d.name === e.activePayload[0].payload.name);
                    if (index >= 0) onPlacementTypeClick(data[index]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Devices']} cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clickable placement type table */}
        <div className="drilldown-table-section glass-panel">
          <h3 className="table-title">Placement Types ({data.length})</h3>
          <div className="table-wrapper">
            <table className="drilldown-table">
              <thead>
                <tr>
                  <th>Placement Type</th>
                  <th>Device Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.placement_type} style={{ animationDelay: `${index * 10}ms` }}>
                    <td title={item.placement_type}>{item.placement_type}</td>
                    <td>{parseInt(item.count).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-view-device"
                        onClick={() => onPlacementTypeClick(item)}
                        title="Explore vendors"
                      >
                        Explore →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                <th>Primary Team</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, index) => (
                <tr key={device.mac_address} style={{ animationDelay: `${index * 10}ms` }}>
                  <td className="mono" title={device.mac_address}>{device.mac_address}</td>
                  <td title={device.model_name || '-'}>{device.model_name || '-'}</td>
                  <td title={device.model_type || '-'}>{device.model_type || '-'}</td>
                  <td>
                    <span className="device-type-badge">{device.device_type}</span>
                  </td>
                  <td title={device.vendor || '-'}>{device.vendor || '-'}</td>
                  <td title={device.team_name || '-'}>{device.team_name || '-'}</td>
                  <td title={device.location_site || '-'}>{device.location_site || '-'}</td>
                  <td title={device.primary_owner || 'Unassigned'}>{device.primary_owner || 'Unassigned'}</td>
                  <td>
                    <button
                      className="btn-view-device"
                      onClick={() => this.props.onDeviceSelect && this.props.onDeviceSelect(device)}
                      title="View device details"
                    >
                      View →
                    </button>
                  </td>
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

        {/* Total devices: device type breakdown (legacy level) */}
        {type === 'total' && level === 'device_type' && this.renderDeviceTypeView()}

        {/* Vendors tile: read-only pie */}
        {type === 'vendors' && level === 'vendor_only' && this.renderVendorOnlyView()}

        {/* Placement Types: first-level placement type list */}
        {type === 'placement_types' && level === 'placement_type' && this.renderPlacementTypeListView()}

        {/* NEW FLOW shared across total + category + placement_types: Vendor → Model → Team → Devices */}
        {level === 'vendor' && this.renderVendorView()}
        {level === 'model_type' && this.renderModelTypeView()}
        {level === 'team' && this.renderTeamView()}
        {level === 'devices' && this.renderDevicesOnlyView()}
      </div>
    );
  }
}

export default DrillDownView;
