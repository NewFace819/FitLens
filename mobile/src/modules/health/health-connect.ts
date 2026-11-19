import { NativeModules, Platform } from 'react-native';

export type HealthConnectSdkStatus = 'available' | 'provider-update-required' | 'unavailable';

export interface TodayStepsResult {
  hasData: boolean;
  steps: number | null;
}

export interface HealthConnectAdapter {
  getSdkStatus(): Promise<HealthConnectSdkStatus>;
  checkPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  getTodaySteps(): Promise<TodayStepsResult>;
  openHealthConnectSettings(): Promise<boolean>;
  openHealthConnectProvider(): Promise<boolean>;
}

function getNativeModule() {
  return NativeModules.FitLensHealthConnect;
}

export const nativeHealthConnectAdapter: HealthConnectAdapter = {
  async getSdkStatus(): Promise<HealthConnectSdkStatus> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      return 'unavailable';
    }
    try {
      const status = await native.getSdkStatus();
      if (status === 'available' || status === 'provider-update-required' || status === 'unavailable') {
        return status;
      }
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  },

  async checkPermission(): Promise<boolean> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      return false;
    }
    return Boolean(await native.checkPermission());
  },

  async requestPermission(): Promise<boolean> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      throw new Error('Health Connect is only available on Android');
    }
    return Boolean(await native.requestPermission());
  },

  async getTodaySteps(): Promise<TodayStepsResult> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      throw new Error('Health Connect is only available on Android');
    }
    const result = await native.getTodaySteps();
    if (result && typeof result === 'object') {
      const hasData = Boolean(result.hasData);
      const steps = typeof result.steps === 'number' ? result.steps : null;
      return { hasData, steps };
    }
    throw new Error('Invalid response from Health Connect');
  },

  async openHealthConnectSettings(): Promise<boolean> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      return false;
    }
    return Boolean(await native.openHealthConnectSettings());
  },

  async openHealthConnectProvider(): Promise<boolean> {
    const native = getNativeModule();
    if (Platform.OS !== 'android' || !native) {
      return false;
    }
    return Boolean(await native.openHealthConnectProvider());
  },
};
