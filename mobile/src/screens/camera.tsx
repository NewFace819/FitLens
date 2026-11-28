import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { useAppNavigation, useAppRoute, goBackOrHome } from '../navigation';
import { LiveCamera } from '../modules/camera/LiveCamera';
export default function CameraScreen() {
  const nav = useAppNavigation();
  const { params } = useAppRoute<'Camera'>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#faf7ed' }}>
      <ScrollView>
        <LiveCamera
          exerciseId={params?.exerciseId ?? 'squat'}
          targetReps={params?.targetReps}
          onBack={() => goBackOrHome(nav)}
          onFinish={reps => {
            const routes = nav.getState().routes;
            const previous = routes[routes.length - 2];
            if (previous?.name === 'Workout')
              nav.dispatch({
                ...CommonActions.setParams({ cameraReps: reps }),
                source: previous.key,
              });
            goBackOrHome(nav);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
