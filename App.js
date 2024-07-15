import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { OrientationLocker, PORTRAIT } from 'react-native-orientation-locker';
import { store } from './src/store/redux/store';
import AppStatusBar from './src/components/status-bar';
import './src/utils/locales/i18n';
import MainNavigator from './navigator';

const App = (props) => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <OrientationLocker orientation={PORTRAIT} />
        <MainNavigator {...props} />
        <AppStatusBar />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
