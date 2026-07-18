import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

import App from './src/App';
import { SENTRY_DSN } from './src/config/api';

if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
