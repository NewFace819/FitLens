import { Platform, NativeModules } from 'react-native';
import { nativeHealthConnectAdapter } from './health-connect';

describe('nativeHealthConnectAdapter at production adapter boundary', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
    delete (NativeModules as any).FitLensHealthConnect;
  });

  test('returns safe fallbacks or rejects when Platform is iOS / module missing', async () => {
    Platform.OS = 'ios';
    expect(await nativeHealthConnectAdapter.getSdkStatus()).toBe('unavailable');
    expect(await nativeHealthConnectAdapter.checkPermission()).toBe(false);
    await expect(nativeHealthConnectAdapter.requestPermission()).rejects.toThrow(
      'Health Connect is only available on Android'
    );
    await expect(nativeHealthConnectAdapter.getTodaySteps()).rejects.toThrow(
      'Health Connect is only available on Android'
    );
    expect(await nativeHealthConnectAdapter.openHealthConnectSettings()).toBe(false);
    expect(await nativeHealthConnectAdapter.openHealthConnectProvider()).toBe(false);
  });

  test('calls NativeModules.FitLensHealthConnect and parses successful results', async () => {
    Platform.OS = 'android';
    (NativeModules as any).FitLensHealthConnect = {
      getSdkStatus: jest.fn().mockResolvedValue('available'),
      checkPermission: jest.fn().mockResolvedValue(true),
      requestPermission: jest.fn().mockResolvedValue(true),
      getTodaySteps: jest.fn().mockResolvedValue({ hasData: true, steps: 5432 }),
      openHealthConnectSettings: jest.fn().mockResolvedValue(true),
      openHealthConnectProvider: jest.fn().mockResolvedValue(true),
    };

    expect(await nativeHealthConnectAdapter.getSdkStatus()).toBe('available');
    expect(await nativeHealthConnectAdapter.checkPermission()).toBe(true);
    expect(await nativeHealthConnectAdapter.requestPermission()).toBe(true);
    expect(await nativeHealthConnectAdapter.getTodaySteps()).toEqual({ hasData: true, steps: 5432 });
    expect(await nativeHealthConnectAdapter.openHealthConnectSettings()).toBe(true);
    expect(await nativeHealthConnectAdapter.openHealthConnectProvider()).toBe(true);
  });

  test('distinguishes genuine zero count (valid data) from absent sample (no data)', async () => {
    Platform.OS = 'android';
    const mockGetTodaySteps = jest.fn();
    (NativeModules as any).FitLensHealthConnect = {
      getTodaySteps: mockGetTodaySteps,
    };

    // Valid count of zero is data: hasData is true, steps is 0
    mockGetTodaySteps.mockResolvedValueOnce({ hasData: true, steps: 0 });
    expect(await nativeHealthConnectAdapter.getTodaySteps()).toEqual({ hasData: true, steps: 0 });

    // Authorized aggregate with absent sample: hasData is false, steps is null
    mockGetTodaySteps.mockResolvedValueOnce({ hasData: false, steps: null });
    expect(await nativeHealthConnectAdapter.getTodaySteps()).toEqual({ hasData: false, steps: null });
  });

  test('propagates native rejected errors for checkPermission, requestPermission and getTodaySteps', async () => {
    Platform.OS = 'android';
    (NativeModules as any).FitLensHealthConnect = {
      getSdkStatus: jest.fn().mockRejectedValue(new Error('SDK check failed')),
      checkPermission: jest.fn().mockRejectedValue(new Error('CHECK_PERMISSION_ERROR: IPC failed')),
      requestPermission: jest.fn().mockRejectedValue(new Error('REQUEST_LAUNCH_ERROR: Activity dead')),
      getTodaySteps: jest.fn().mockRejectedValue(new Error('READ_STEPS_ERROR: DB lock')),
    };

    // getSdkStatus safely falls back to unavailable on exception
    expect(await nativeHealthConnectAdapter.getSdkStatus()).toBe('unavailable');

    // checkPermission must NOT swallow error as false (which would falsely infer denial)
    await expect(nativeHealthConnectAdapter.checkPermission()).rejects.toThrow(
      'CHECK_PERMISSION_ERROR: IPC failed'
    );

    // requestPermission must NOT swallow launch failure as false
    await expect(nativeHealthConnectAdapter.requestPermission()).rejects.toThrow(
      'REQUEST_LAUNCH_ERROR: Activity dead'
    );

    // getTodaySteps must NOT swallow read failure as no-data
    await expect(nativeHealthConnectAdapter.getTodaySteps()).rejects.toThrow(
      'READ_STEPS_ERROR: DB lock'
    );
  });
});
