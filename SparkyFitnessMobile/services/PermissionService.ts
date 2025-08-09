import * as HealthKit from '@yzlin/expo-healthkit';
import {
  HKAuthorizationStatus,
  HKCategoryTypeIdentifier,
  HKQuantityTypeIdentifier,
} from '@yzlin/expo-healthkit';
import { Platform } from 'react-native';
// import HealthConnect from 'expo-health-connect';

// Define common health data types that the app might request
export const HEALTH_DATA_TYPES = {
  steps: {
    android: 'android.permission.health.READ_STEPS',
    ios: HKQuantityTypeIdentifier.stepCount,
  },
  heartRate: {
    android: 'android.permission.health.READ_HEART_RATE',
    ios: HKQuantityTypeIdentifier.heartRate,
  },
  activeEnergyBurned: {
    android: 'android.permission.health.READ_ACTIVE_ENERGY_BURNED',
    ios: HKQuantityTypeIdentifier.activeEnergyBurned,
  },
  sleepAnalysis: {
    android: 'android.permission.health.READ_SLEEP_SESSION',
    ios: HKCategoryTypeIdentifier.sleepAnalysis,
  },
  // Add more as needed
};

type HealthDataType = keyof typeof HEALTH_DATA_TYPES;
// type HealthConnectPermission = {
//   access: 'granted' | 'denied';
//   permission: string;
// };

const PermissionService = {
  /**
   * Requests health data permissions based on the platform.
   * @param types An array of HealthDataType strings to request permissions for.
   * @returns A promise that resolves to true if permissions are granted, false otherwise.
   */
  requestHealthPermissions: async (types: HealthDataType[]): Promise<boolean> => {
    if (Platform.OS === 'android') {
      // return PermissionService.requestAndroidHealthConnectPermissions(types);
      console.warn('Android permissions are currently disabled.');
      return false;
    } else if (Platform.OS === 'ios') {
      return PermissionService.requestIosHealthKitPermissions(types);
    }
    console.warn('Health data permissions not supported on this platform.');
    return false;
  },

  /**
   * Checks if health data permissions are granted based on the platform.
   * @param types An array of HealthDataType strings to check permissions for.
   * @returns A promise that resolves to true if permissions are granted, false otherwise.
   */
  checkHealthPermissions: async (types: HealthDataType[]): Promise<boolean> => {
    if (Platform.OS === 'android') {
      // return PermissionService.checkAndroidHealthConnectPermissions(types);
      console.warn('Android permissions are currently disabled.');
      return false;
    } else if (Platform.OS === 'ios') {
      return PermissionService.checkIosHealthKitPermissions(types);
    }
    return false;
  },

  /**
   * Requests Health Connect permissions for Android.
   * @param types An array of HealthDataType strings.
   */
  // requestAndroidHealthConnectPermissions: async (types: HealthDataType[]): Promise<boolean> => {
  //   try {
  //     const androidPermissions = types.map(type => HEALTH_DATA_TYPES[type].android);
  //     const grantedPermissions = await HealthConnect.requestPermissions(androidPermissions);
  //     return grantedPermissions.every((p: HealthConnectPermission) => p.access === 'granted');
  //   } catch (error) {
  //     console.error('Error requesting Health Connect permissions:', error);
  //     return false;
  //   }
  // },

  /**
   * Checks Health Connect permissions for Android.
   * @param types An array of HealthDataType strings.
   */
  // checkAndroidHealthConnectPermissions: async (types: HealthDataType[]): Promise<boolean> => {
  //   try {
  //     const androidPermissions = types.map(type => HEALTH_DATA_TYPES[type].android);
  //     const grantedPermissions = await HealthConnect.getGrantedPermissions(androidPermissions);
  //     return grantedPermissions.every((p: HealthConnectPermission) => p.access === 'granted');
  //   } catch (error) {
  //     console.error('Error checking Health Connect permissions:', error);
  //     return false;
  //   }
  // },

  /**
   * Requests HealthKit permissions for iOS.
   * @param types An array of HealthDataType strings.
   */
  requestIosHealthKitPermissions: async (types: HealthDataType[]): Promise<boolean> => {
    try {
      const iosReadPermissions = types.map(type => HEALTH_DATA_TYPES[type].ios);
      const isAuthorized = await HealthKit.requestAuthorization(iosReadPermissions, []);
      return isAuthorized;
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      return false;
    }
  },

  /**
   * Checks HealthKit permissions for iOS.
   * @param types An array of HealthDataType strings.
   */
  checkIosHealthKitPermissions: async (types: HealthDataType[]): Promise<boolean> => {
    try {
      const iosReadPermissions = types.map(type => HEALTH_DATA_TYPES[type].ios);
      const results = await Promise.all(
        iosReadPermissions.map(async type => {
          const status = await HealthKit.authorizationStatusFor(type);
          return status;
        })
      );
      return results.every(status => status === HKAuthorizationStatus.sharingAuthorized);
    } catch (error) {
      console.error('Error checking HealthKit permissions:', error);
      return false;
    }
  },
};

export default PermissionService;