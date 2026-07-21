const pool = require('../../config/db');

// ============================================================
// DICTIONARY CACHE — module-level singleton
// Loads all distinct searchable values from the devices table.
// ============================================================

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = {
  vendors:          [],
  teamNames:        [],
  currentTeams:     [],
  locationSites:    [],
  locationScopes:   [],
  racks:            [],
  primaryOwners:    [],
  currentUsers:     [],
  modelNames:       [],
  modelAliases:     [],
  modelTypes:       [],
  placementTypes:   [],
  catsTypes:        [],
  usagePurposes:    [],
  automationFilters:[],
  deviceRepurposes: [],
  loadedAt:         null,
  loading:          false,
};

/**
 * Load all distinct non-null values from the devices table in parallel.
 */
async function load() {
  if (cache.loading) return;
  cache.loading = true;

  try {
    const [
      vendors, teamNames, currentTeams, locationSites, locationScopes,
      racks, primaryOwners, currentUsers, modelNames, modelAliases,
      modelTypes, placementTypes, catsTypes, usagePurposes,
      automationFilters, deviceRepurposes
    ] = await Promise.all([
      pool.query('SELECT DISTINCT vendor FROM devices WHERE vendor IS NOT NULL ORDER BY vendor'),
      pool.query('SELECT DISTINCT team_name FROM devices WHERE team_name IS NOT NULL ORDER BY team_name'),
      pool.query('SELECT DISTINCT current_team FROM devices WHERE current_team IS NOT NULL ORDER BY current_team'),
      pool.query('SELECT DISTINCT location_site FROM devices WHERE location_site IS NOT NULL ORDER BY location_site'),
      pool.query('SELECT DISTINCT location_scope FROM devices WHERE location_scope IS NOT NULL ORDER BY location_scope'),
      pool.query('SELECT DISTINCT rack FROM devices WHERE rack IS NOT NULL ORDER BY rack'),
      pool.query('SELECT DISTINCT primary_owner FROM devices WHERE primary_owner IS NOT NULL ORDER BY primary_owner'),
      pool.query('SELECT DISTINCT "current_user" FROM devices WHERE "current_user" IS NOT NULL ORDER BY "current_user"'),
      pool.query('SELECT DISTINCT model_name FROM devices WHERE model_name IS NOT NULL ORDER BY model_name'),
      pool.query('SELECT DISTINCT model_alias FROM devices WHERE model_alias IS NOT NULL ORDER BY model_alias'),
      pool.query('SELECT DISTINCT model_type FROM devices WHERE model_type IS NOT NULL ORDER BY model_type'),
      pool.query('SELECT DISTINCT placement_type FROM devices WHERE placement_type IS NOT NULL ORDER BY placement_type'),
      pool.query('SELECT DISTINCT cats_type FROM devices WHERE cats_type IS NOT NULL ORDER BY cats_type'),
      pool.query('SELECT DISTINCT usage_purpose FROM devices WHERE usage_purpose IS NOT NULL ORDER BY usage_purpose'),
      pool.query('SELECT DISTINCT automation_filter FROM devices WHERE automation_filter IS NOT NULL ORDER BY automation_filter'),
      pool.query('SELECT DISTINCT device_repurpose FROM devices WHERE device_repurpose IS NOT NULL ORDER BY device_repurpose'),
    ]);

    cache.vendors           = vendors.rows.map(r => r.vendor);
    cache.teamNames         = teamNames.rows.map(r => r.team_name);
    cache.currentTeams      = currentTeams.rows.map(r => r.current_team);
    cache.locationSites     = locationSites.rows.map(r => r.location_site);
    cache.locationScopes    = locationScopes.rows.map(r => r.location_scope);
    cache.racks             = racks.rows.map(r => r.rack);
    cache.primaryOwners     = primaryOwners.rows.map(r => r.primary_owner);
    cache.currentUsers      = currentUsers.rows.map(r => r.current_user);
    cache.modelNames        = modelNames.rows.map(r => r.model_name);
    cache.modelAliases      = modelAliases.rows.map(r => r.model_alias);
    cache.modelTypes        = modelTypes.rows.map(r => r.model_type);
    cache.placementTypes    = placementTypes.rows.map(r => r.placement_type);
    cache.catsTypes         = catsTypes.rows.map(r => r.cats_type);
    cache.usagePurposes     = usagePurposes.rows.map(r => r.usage_purpose);
    cache.automationFilters = automationFilters.rows.map(r => r.automation_filter);
    cache.deviceRepurposes  = deviceRepurposes.rows.map(r => r.device_repurpose);
    cache.loadedAt          = Date.now();

    console.log(
      `[NLQuery] Dictionary cache loaded — ` +
      `${cache.vendors.length} vendors, ` +
      `${cache.teamNames.length} teams, ` +
      `${cache.locationSites.length} locations, ` +
      `${cache.currentUsers.length} users`
    );
  } catch (err) {
    console.error('[NLQuery] Dictionary cache load failed:', err.message);
  } finally {
    cache.loading = false;
  }
}

/**
 * Force a full reload of the dictionary cache.
 * Called after CSV uploads and from the admin refresh endpoint.
 */
async function refresh() {
  cache.loadedAt = null;
  await load();
}

/**
 * Get the current cache, triggering a background refresh if TTL has expired.
 */
function get() {
  if (!cache.loadedAt) {
    // Not yet loaded — this shouldn't happen in normal flow (server.js calls load())
    // but handle it gracefully
    load().catch(err => console.error('[NLQuery] On-demand load failed:', err.message));
  } else if (Date.now() - cache.loadedAt > TTL_MS) {
    // Stale — refresh in background, serve current data for this request
    load().catch(err => console.error('[NLQuery] Background refresh failed:', err.message));
  }
  return cache;
}

module.exports = { load, refresh, get };
