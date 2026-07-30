import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const slides = [
  { id: 1, title: 'Track Everything', desc: 'All your school management needs in one place.' },
  { id: 2, title: 'Real-time Updates', desc: 'Syncs instantly with the web dashboard.' },
  { id: 3, title: 'Get Started', desc: 'Join the Zuna-Schools community today.' },
];

export default function OnboardingScreen({ navigation }) {
  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Zuna-Schools</Text>
      
      {/* Example static representation of slides, ideally use FlatList for swiping */}
      <View style={styles.slidesContainer}>
         {slides.map(s => (
           <View key={s.id} style={styles.slide}>
             <Text style={styles.slideTitle}>{s.title}</Text>
             <Text style={styles.slideDesc}>{s.desc}</Text>
           </View>
         ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={completeOnboarding}>
        <Text style={styles.buttonText}>Skip to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  slidesContainer: { marginVertical: 40 },
  slide: { width, alignItems: 'center', padding: 20 },
  slideTitle: { fontSize: 20, fontWeight: '600', marginBottom: 10 },
  slideDesc: { fontSize: 16, color: '#666', textAlign: 'center' },
  button: { padding: 15, backgroundColor: '#007AFF', borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
