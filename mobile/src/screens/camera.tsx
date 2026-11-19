/** Camera UI port; pose/rep tracking is a separate DO2/DO3 task. */
import React from 'react';
import { useAppNavigation, goBackOrHome, useAppRoute } from '../navigation';
import { Screen } from '../ui/components';
import { CameraScreen as CameraView } from '../modules/camera/CameraView';
export default function CameraScreen() {
  const nav = useAppNavigation();
  const { params } = useAppRoute<'Camera'>();
  return (
    <Screen>
      <CameraView
        onBack={() => goBackOrHome(nav)}
        exerciseId={params?.exerciseId}
        targetReps={params?.targetReps}
      />
    </Screen>
  );
}
