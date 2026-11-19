/** Camera UI only; pose tracking remains DO2/DO3. */
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation, goBackOrHome, useAppRoute } from '../navigation';
import { CameraScreen as CameraView } from '../modules/camera/CameraView';
export default function CameraScreen() {
  const nav = useAppNavigation();
  const { params } = useAppRoute<'Camera'>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#faf7ed' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
        <CameraView
          onBack={() => goBackOrHome(nav)}
          exerciseId={params?.exerciseId}
          targetReps={params?.targetReps}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
