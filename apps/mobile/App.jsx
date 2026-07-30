import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';

// Screens
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import LoginScreen from './src/screens/Auth/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        if (hasOnboarded === 'true') {
          setIsFirstLaunch(false);
        } else {
          setIsFirstLaunch(true);
        }
      } catch (error) {
        setIsFirstLaunch(true);
      } finally {
        await BootSplash.hide({ fade: true });
      }
    }
    
    checkOnboarding();
  }, []);

  if (isFirstLaunch === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch && (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
