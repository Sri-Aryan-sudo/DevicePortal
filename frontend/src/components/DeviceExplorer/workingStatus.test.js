import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { renderToStaticMarkup } from 'react-dom/server';
import DeviceExplorer from './index';
import DeviceTable from './DeviceTable';
import FilterPanel from './FilterPanel';
import DeviceDetail from '../DeviceDetail';
import { deviceAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  deviceAPI: {
    getDevices: jest.fn(),
    getFilterOptions: jest.fn(),
    getDeviceByMac: jest.fn(),
    getAuditLog: jest.fn(),
    updateDeviceByPOC: jest.fn()
  }
}));

const devices = ['Good', 'Bad', 'Unknown'].map((working_status, index) => ({
  mac_address: `00:11:22:33:44:0${index}`,
  device_type: 'STB',
  vendor: 'Vendor',
  team_name: 'Team',
  location_site: index === 2 ? 'Site B' : 'Site A',
  model_type: index === 0 ? 'MODEL_ONE' : 'MODEL_TWO',
  working_status
}));
const filterOptions = {
  deviceTypes: ['STB'], vendors: ['Vendor'], teams: ['Team'],
  locations: ['Site A', 'Site B'], workingStatuses: ['Good', 'Bad', 'Unknown']
};

function explorerInstance() {
  const explorer = new DeviceExplorer({});
  explorer.setState = (change, callback) => {
    explorer.state = { ...explorer.state, ...(typeof change === 'function' ? change(explorer.state) : change) };
    if (callback) callback();
  };
  explorer.state.devices = devices;
  return explorer;
}

beforeEach(() => {
  jest.clearAllMocks();
  deviceAPI.getDevices.mockResolvedValue({ data: { devices } });
  deviceAPI.getFilterOptions.mockResolvedValue({ data: filterOptions });
});

test('status supports multi-select and combines with all existing filters', () => {
  const explorer = explorerInstance();
  const selected = {
    deviceType: ['STB'], vendor: ['Vendor'], team: ['Team'],
    location: ['Site A'], workingStatus: ['Good', 'Bad']
  };
  expect(explorer.applySelectedFilters(devices, selected)).toEqual(devices.slice(0, 2));
  expect(explorer.applySelectedFilters(devices, { ...selected, vendor: ['Other Vendor'] })).toEqual([]);
  expect(explorer.applySelectedFilters(devices, { ...selected, workingStatus: ['Unknown'] })).toEqual([]);
});

test.each(['Good', 'Bad', 'Unknown'])('fetching devices filters by %s', async status => {
  const explorer = explorerInstance();
  explorer.state.selectedFilters.workingStatus = [status];
  await explorer.fetchDevices();
  expect(explorer.state.filteredDevices).toEqual(devices.filter(device => device.working_status === status));
  expect(explorer.state.totalRecords).toBe(1);
});

test('searching and clearing search preserve the working status filter and reset pagination', () => {
  const explorer = explorerInstance();
  explorer.state.selectedFilters.workingStatus = ['Bad'];
  explorer.state.currentPage = 3;
  explorer.handleSearchChange({ target: { value: 'model_one' } });
  expect(explorer.state.filteredDevices).toEqual([]);
  expect(explorer.state.currentPage).toBe(1);
  explorer.handleSearchClear();
  expect(explorer.state.filteredDevices).toEqual([devices[1]]);
  expect(explorer.state.totalRecords).toBe(1);
});

test('toggling status and clearing all filters refresh results', async () => {
  const explorer = explorerInstance();
  jest.spyOn(explorer, 'fetchDevices');
  explorer.state.currentPage = 3;
  explorer.handleFilterChange('workingStatus', 'Bad');
  await explorer.fetchDevices.mock.results[0].value;
  expect(explorer.state.filteredDevices).toEqual([devices[1]]);
  expect(explorer.state.currentPage).toBe(1);
  explorer.handleFilterChange('workingStatus', 'Bad');
  await explorer.fetchDevices.mock.results[1].value;
  expect(explorer.state.filteredDevices).toEqual(devices);
  explorer.handleFilterChange('workingStatus', 'Good');
  await explorer.fetchDevices.mock.results[2].value;
  explorer.handleClearFilters();
  await explorer.fetchDevices.mock.results[3].value;
  expect(explorer.state.selectedFilters.workingStatus).toEqual([]);
  expect(explorer.state.filteredDevices).toEqual(devices);
});

test('filter options load all statuses and panel renders their checkboxes', async () => {
  const explorer = explorerInstance();
  await explorer.loadFilterOptions();
  expect(explorer.state.filterOptions.workingStatuses).toEqual(['Good', 'Bad', 'Unknown']);
  const markup = renderToStaticMarkup(
    <FilterPanel isOpen selectedFilters={explorer.state.selectedFilters} filterOptions={filterOptions} />
  );
  expect(markup).toContain('Working Status');
  for (const status of filterOptions.workingStatuses) expect(markup).toContain(`>${status}</span>`);
});

test('table displays status values and uses eight columns for its empty state', () => {
  const markup = renderToStaticMarkup(<DeviceTable devices={devices} />);
  expect(markup).toContain('Working Status');
  for (const status of filterOptions.workingStatuses) expect(markup).toContain(`>${status}</td>`);
  expect(renderToStaticMarkup(<DeviceTable devices={[]} />)).toContain('colSpan="8"');
});

test.each(['POC', 'ADMIN'])('%s can select and save status in Device Details', async role => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  const container = document.createElement('div');
  const root = createRoot(container);
  let detail;
  deviceAPI.getDeviceByMac.mockResolvedValue({ data: devices[2] });
  deviceAPI.getAuditLog.mockResolvedValue({ data: [] });
  deviceAPI.updateDeviceByPOC.mockResolvedValue({ data: { device: { ...devices[2], working_status: 'Bad' } } });
  try {
    await act(async () => {
      root.render(<DeviceDetail ref={instance => { detail = instance; }} device={devices[2]} userRole={role} authToken="test-token" />);
    });
    act(() => container.querySelector('.btn-edit').click());
    const select = container.querySelector('select[aria-label="Working Status"]');
    expect(select.value).toBe('Unknown');
    expect(Array.from(select.options, option => option.value)).toEqual(['Good', 'Bad', 'Unknown']);
    act(() => Simulate.change(select, { target: { value: 'Bad' } }));
    deviceAPI.getDeviceByMac.mockResolvedValue({ data: { ...devices[2], working_status: 'Bad' } });
    await act(async () => container.querySelector('.btn-save').click());
    expect(deviceAPI.updateDeviceByPOC).toHaveBeenCalledWith(
      devices[2].mac_address, expect.objectContaining({ working_status: 'Bad' }), 'test-token'
    );
    expect(detail.state.device.working_status).toBe('Bad');
    expect(container.querySelector('select')).toBeNull();
  } finally {
    act(() => root.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test('VIEWER can read status but cannot edit', () => {
  const detail = new DeviceDetail({ userRole: 'VIEWER' });
  detail.state.device = devices[0];
  const markup = renderToStaticMarkup(detail.renderHeroCard());
  expect(markup).toContain('Working Status');
  expect(markup).toContain('Good');
  expect(markup).not.toContain('btn-edit');
  expect(markup).not.toContain('<select');
});
