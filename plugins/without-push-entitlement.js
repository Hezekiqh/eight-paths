// expo-notifications always adds the push (`aps-environment`) entitlement.
// Eight Paths only schedules local notifications, which don't need it, and
// the POC ships with no entitlements, so strip it back out.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
