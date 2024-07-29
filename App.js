import { Provider } from 'react-redux';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { OrientationLocker, PORTRAIT } from 'react-native-orientation-locker';
import { store } from './src/store/redux/store';
import AppStatusBar from './src/components/status-bar';
import './src/utils/locales/i18n';
import MainNavigator from './src/screens/main-navigator';
import Colors from './src/constants/colors';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.blueBackgroundColor
  },
};

const App = (props) => {
  return (
    <Provider store={store}>
      <NavigationContainer theme={MyTheme}>
        <OrientationLocker orientation={PORTRAIT} />
        <MainNavigator {...props} />
        <AppStatusBar />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
