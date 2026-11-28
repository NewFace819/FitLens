import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import { NativePoseCamera, hasNativePoseCamera } from './NativePoseCamera';
import {
  CameraSession,
  supportsSquat,
  type PoseFrame,
  type CameraSnapshot,
} from './camera-session';
import { Button } from '../home/primitives';
import { Icon } from '../home/Icon';
const empty: CameraSnapshot = {
  reps: 0,
  angle: null,
  isDown: false,
  visible: false,
};
export function LiveCamera({
  exerciseId,
  targetReps,
  onBack,
  onFinish,
}: {
  exerciseId: string;
  targetReps?: number;
  onBack: () => void;
  onFinish: (reps: number) => void;
}) {
  const focused = useIsFocused();
  const session = useRef(new CameraSession()).current;
  const [permission, setPermission] = useState<
      'checking' | 'granted' | 'denied' | 'blocked'
    >('checking'),
    [foreground, setForeground] = useState(
      AppState.currentState !== 'background' &&
        AppState.currentState !== 'inactive',
    ),
    [front, setFront] = useState(false),
    [mode, setMode] = useState<'preview' | 'running' | 'paused'>('preview'),
    [pose, setPose] = useState(empty),
    [frame, setFrame] = useState<PoseFrame | null>(null),
    [error, setError] = useState(''),
    [received, setReceived] = useState(false),
    [restart, setRestart] = useState(0),
    [size, setSize] = useState({ width: 1, height: 1 });
  const valid = supportsSquat(exerciseId);
  const target =
    Number.isInteger(targetReps) && targetReps! > 0 ? targetReps : null;
  const active =
    permission === 'granted' &&
    focused &&
    foreground &&
    !error &&
    mode !== 'paused' &&
    valid;
  useEffect(() => {
    let mounted = true;
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA).then(
      granted => {
        if (mounted) setPermission(granted ? 'granted' : 'denied');
      },
    );
    const sub = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') {
        setPose(session.pause());
        setMode(previous => (previous === 'running' ? 'paused' : previous));
      } else
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA).then(
          granted => {
            if (mounted) setPermission(granted ? 'granted' : 'denied');
          },
        );
    });
    return () => {
      mounted = false;
      sub.remove();
      session.pause();
    };
  }, [session]);
  useEffect(() => {
    if (!focused) {
      setPose(session.pause());
      setMode(previous => (previous === 'running' ? 'paused' : previous));
    }
  }, [focused, session]);
  useEffect(() => {
    if (!active || received) return;
    const timeout = setTimeout(
      () =>
        setError(
          'No camera frames received. Try restarting the camera or switching cameras.',
        ),
      20000,
    );
    return () => clearTimeout(timeout);
  }, [active, received]);
  async function request() {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera for squat counting',
          message:
            'FitLens processes your pose on this device. Video is never saved or uploaded.',
          buttonPositive: 'Continue',
          buttonNegative: 'Not now',
        },
      );
      setPermission(
        result === PermissionsAndroid.RESULTS.GRANTED
          ? 'granted'
          : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
          ? 'blocked'
          : 'denied',
      );
    } catch {
      setError('Camera permission could not be requested. Try again.');
    }
  }
  function retry() {
    setError('');
    setReceived(false);
    setRestart(n => n + 1);
    if (mode === 'paused') {
      session.resume();
      setMode('running');
    }
  }
  function toggleFront() {
    setPose(session.pause());
    if (mode === 'running') session.resume();
    setFrame(null);
    setFront(value => !value);
    setReceived(false);
    setError('');
  }
  function onFrame(value: PoseFrame) {
    if (!active) return;
    setReceived(true);
    setFrame(value);
    setPose(session.frame(value));
  }
  function start() {
    setPose(session.start());
    setMode('running');
  }
  function pause() {
    setPose(session.pause());
    setMode('paused');
  }
  function resume() {
    session.resume();
    setMode('running');
    setReceived(false);
    setError('');
  }
  const label = error
    ? 'Camera unavailable'
    : mode === 'paused'
    ? 'Paused'
    : !received
    ? 'Preparing camera…'
    : !pose.visible
    ? 'Bring your full leg into view'
    : mode === 'preview'
    ? 'Ready when you are'
    : pose.isDown
    ? 'Now stand tall'
    : 'Squat down';
  const scale = frame
    ? Math.min(size.width / frame.width, size.height / frame.height)
    : 1;
  const offsetX = frame ? (size.width - frame.width * scale) / 2 : 0,
    offsetY = frame ? (size.height - frame.height * scale) / 2 : 0;
  const point = (index: number) => {
    const p = frame?.landmarks[index];
    return p && p.visibility !== undefined && p.visibility >= 0.5
      ? {
          x: offsetX + (front ? 1 - p.x : p.x) * (frame?.width ?? 1) * scale,
          y: offsetY + p.y * (frame?.height ?? 1) * scale,
        }
      : null;
  };
  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={s.round}
        >
          <Icon name="left" />
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.kicker}>ON-DEVICE CAMERA</Text>
          <Text style={s.title}>Squat counter</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          onPress={toggleFront}
          style={s.round}
        >
          <Text style={{ fontSize: 24, color: '#344d3d' }}>⇄</Text>
        </Pressable>
      </View>
      {!valid ? (
        <View style={s.message}>
          <Text style={s.title}>Squats only for now</Text>
          <Text style={s.body}>
            This camera counter does not support {exerciseId}. Return to your
            workout to log reps manually.
          </Text>
          <Button label="Back to workout" onPress={onBack} />
        </View>
      ) : !hasNativePoseCamera ? (
        <View style={s.message}>
          <Text style={s.title}>Camera build required</Text>
          <Text style={s.body}>
            Install the latest Android APK to enable on-device pose detection.
          </Text>
        </View>
      ) : permission !== 'granted' ? (
        <View style={s.message}>
          <Text style={s.title}>A little room to move.</Text>
          <Text style={s.body}>
            Place your phone side-on, about 2–3 metres away. Keep your hip, knee
            and ankle visible.
          </Text>
          <Text style={s.body}>
            Camera frames stay on this device. Nothing is recorded or uploaded.
          </Text>
          {permission === 'checking' ? (
            <ActivityIndicator />
          ) : (
            <Button
              label={
                permission === 'blocked' ? 'Open app settings' : 'Enable camera'
              }
              onPress={
                permission === 'blocked'
                  ? () => {
                      void Linking.openSettings();
                    }
                  : () => {
                      void request();
                    }
              }
            />
          )}
          <Button quiet label="Not now" onPress={onBack} />
        </View>
      ) : (
        <>
          <View
            style={s.preview}
            onLayout={event => setSize(event.nativeEvent.layout)}
          >
            <NativePoseCamera
              key={restart}
              style={StyleSheet.absoluteFill}
              active={active}
              front={front}
              onPose={event => onFrame(event.nativeEvent)}
              onCameraError={event => {
                setError(event.nativeEvent.message);
                setPose(session.pause());
                setMode(previous =>
                  previous === 'running' ? 'paused' : previous,
                );
              }}
            />
            <Svg
              pointerEvents="none"
              width={size.width}
              height={size.height}
              style={StyleSheet.absoluteFill}
            >
              {[
                [23, 25],
                [25, 27],
                [24, 26],
                [26, 28],
                [23, 24],
              ].map(([a, b]) => {
                const p = point(a),
                  q = point(b);
                return p && q ? (
                  <Line
                    key={a + '-' + b}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    stroke="#d8ecac"
                    strokeWidth={4}
                  />
                ) : null;
              })}
              {[23, 24, 25, 26, 27, 28].map(i => {
                const p = point(i);
                return p ? (
                  <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#fff9ec" />
                ) : null;
              })}
            </Svg>
            <View pointerEvents="none" style={s.overlay}>
              <Text style={s.live}>
                {active ? '● LIVE · SIDE VIEW' : 'CAMERA PAUSED'}
              </Text>
              <View style={s.repBubble}>
                <Text style={s.count} accessibilityLiveRegion="polite">
                  {pose.reps}
                </Text>
                <Text style={s.repLabel}>
                  {target ? `of ${target} reps` : 'reps'}
                </Text>
              </View>
            </View>
            {!received && active && (
              <ActivityIndicator style={s.spinner} color="#fff9ec" />
            )}
          </View>
          <View
            accessibilityLiveRegion="polite"
            style={[
              s.feedback,
              { backgroundColor: error ? '#f5e4d7' : '#e3ead9' },
            ]}
          >
            <Text style={s.feedbackTitle}>{label}</Text>
            <Text style={s.body}>
              {error ||
                (mode === 'paused'
                  ? 'Resume when you are ready. Camera is off.'
                  : pose.visible
                  ? pose.angle === null
                    ? 'Stand side-on before starting.'
                    : `Knee angle ${Math.round(pose.angle)}° · ${
                        mode === 'preview'
                          ? 'Press Start to count.'
                          : 'Move at your own pace.'
                      }`
                  : 'Turn sideways. Keep your feet in frame and use good lighting.')}
            </Text>
          </View>
          {error && <Button label="Retry camera" onPress={retry} />}
          {mode === 'preview' ? (
            <Button
              label="Start counting"
              disabled={!pose.visible || !!error || !received}
              onPress={start}
            />
          ) : (
            <View style={{ gap: 8 }}>
              <View style={s.actions}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={mode === 'paused' ? 'Resume' : 'Pause'}
                    disabled={!!error}
                    onPress={mode === 'paused' ? resume : pause}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    quiet
                    label="Reset"
                    onPress={() =>
                      Alert.alert(
                        'Reset count?',
                        'This clears reps in the current camera session only.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reset',
                            onPress: () => {
                              setPose(session.start());
                              setMode('running');
                            },
                          },
                        ],
                      )
                    }
                  />
                </View>
              </View>
              <Button
                label={`Done · ${pose.reps} reps`}
                onPress={() => {
                  session.pause();
                  onFinish(pose.reps);
                }}
              />
            </View>
          )}
          <Text style={s.note}>
            Counts movement repetitions, not exercise form. Stop if you feel
            pain.
          </Text>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  page: { gap: 14, padding: 16, paddingBottom: 28, backgroundColor: '#faf7ed' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 4,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9eddf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#687c66',
    fontWeight: '700',
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#293d34',
    letterSpacing: -0.5,
  },
  body: { fontSize: 13, lineHeight: 20, color: '#63735d' },
  message: {
    padding: 24,
    gap: 18,
    borderRadius: 26,
    backgroundColor: '#eeefe7',
    marginTop: 24,
  },
  preview: {
    height: 390,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1e3027',
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  live: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#fff9ec',
    backgroundColor: '#1e3027b0',
    padding: 8,
    borderRadius: 10,
  },
  repBubble: {
    backgroundColor: '#f7f6f2ed',
    borderRadius: 20,
    padding: 14,
    minWidth: 84,
    alignItems: 'center',
  },
  count: { fontSize: 44, lineHeight: 48, color: '#29483b', fontWeight: '700' },
  repLabel: { fontSize: 11, color: '#63735d' },
  spinner: { position: 'absolute', left: 0, right: 0, top: '50%' },
  feedback: { borderRadius: 20, padding: 16, gap: 5 },
  feedbackTitle: { fontSize: 17, fontWeight: '600', color: '#344d3d' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { fontSize: 11, lineHeight: 17, color: '#7a8973', textAlign: 'center' },
});
