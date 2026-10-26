// expo-notifications' config plugin is applied automatically when the package
// is installed, and it always adds the push entitlement (aps-environment).
// 86'd only schedules LOCAL reminders on the phone (src/services/countReminder),
// which need no entitlement — and adding one changes the app's capabilities and
// provisioning profile for nothing. This takes it back out.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, cfg => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
