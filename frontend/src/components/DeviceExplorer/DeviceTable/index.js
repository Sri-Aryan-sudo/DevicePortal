import React, { memo } from 'react';

const DeviceTableRow = memo(({ device, index, onSelect }) => {
  return (
    <tr
      className="device-row"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onSelect}
    >
      <td className="device-id mono">{device.mac_address}</td>
      <td>
        <span className="device-type-badge">{device.device_type}</span>
      </td>
      <td>{device.model_name}</td>
      <td>{device.vendor}</td>
      <td>{device.team_name}</td>
      <td>{device.location_site}</td>
      <td>
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          View →
        </button>
      </td>
    </tr>
  );
});

DeviceTableRow.displayName = 'DeviceTableRow';

const DeviceTable = memo(({ 
  devices, 
  sortBy, 
  sortOrder, 
  onSort, 
  onDeviceSelect 
}) => {
  const renderSortIndicator = (column) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="devices-table-container glass-panel">
      <table className="devices-table">
        <thead>
          <tr>
            <th onClick={() => onSort('mac_address')}>
              MAC Address{renderSortIndicator('mac_address')}
            </th>
            <th onClick={() => onSort('device_type')}>
              Type{renderSortIndicator('device_type')}
            </th>
            <th onClick={() => onSort('model_name')}>
              Model{renderSortIndicator('model_name')}
            </th>
            <th onClick={() => onSort('vendor')}>
              Vendor{renderSortIndicator('vendor')}
            </th>
            <th onClick={() => onSort('team_name')}>
              Team{renderSortIndicator('team_name')}
            </th>
            <th onClick={() => onSort('location_site')}>
              Location{renderSortIndicator('location_site')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                No devices found
              </td>
            </tr>
          ) : (
            devices.map((device, index) => (
              <DeviceTableRow
                key={device.mac_address}
                device={device}
                index={index}
                onSelect={() => onDeviceSelect(device)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

DeviceTable.displayName = 'DeviceTable';

export default DeviceTable;
