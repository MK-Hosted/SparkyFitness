import * as HealthKit from '@yzlin/expo-healthkit';
import { Platform } from 'react-native';
import { HEALTH_DATA_TYPES } from './PermissionService';

interface HealthDataRecord {
  type: string;
  value: any;
  unit?: string;
  date: string;
}

const HealthDataService = {
  /**
   * Fetches health data for specified types.
   * @param types An array of HealthDataType strings to fetch data for.
   * @param startDate The start date for data retrieval.
   * @param endDate The end date for data retrieval.
   * @returns A promise that resolves to an array of HealthDataRecord.
   */
  fetchHealthData: async (
    types: (keyof typeof HEALTH_DATA_TYPES)[],
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataRecord[]> => {
    if (Platform.OS === 'android') {
      return HealthDataService.fetchAndroidHealthConnectData(types, startDate, endDate);
    } else if (Platform.OS === 'ios') {
      return HealthDataService.fetchIosHealthKitData(types, startDate, endDate);
    }
    console.warn('Health data fetching not supported on this platform.');
    return [];
  },

  /**
   * Fetches Health Connect data for Android.
   * @param types An array of HealthDataType strings.
   * @param startDate The start date for data retrieval.
   * @param endDate The end date for data retrieval.
   */
  fetchAndroidHealthConnectData: async (
    types: (keyof typeof HEALTH_DATA_TYPES)[],
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataRecord[]> => {
    console.warn('Android Health Connect data fetching is not yet implemented.');
    // TODO: Implement Health Connect data fetching
    return [];
  },

  /**
   * Fetches HealthKit data for iOS.
   * @param types An array of HealthDataType strings.
   * @param startDate The start date for data retrieval.
   * @param endDate The end date for data retrieval.
   */
  fetchIosHealthKitData: async (
    types: (keyof typeof HEALTH_DATA_TYPES)[],
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataRecord[]> => {
    const allFetchedData: HealthDataRecord[] = [];

    for (const type of types) {
      const healthKitType = HEALTH_DATA_TYPES[type].ios;
      if (!healthKitType) {
        console.warn(`HealthKit type not defined for ${type}`);
        continue;
      }

      try {
        let data: any; // Changed type to any
        if (healthKitType.startsWith('HKQuantityTypeIdentifier')) {
          data = await HealthKit.queryQuantitySamples(
            healthKitType,
            {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }
          );
        } else if (healthKitType.startsWith('HKCategoryTypeIdentifier')) {
          data = await HealthKit.queryCategorySamples(
            healthKitType,
            {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }
          );
        } else {
          console.warn(`Unsupported HealthKit type: ${healthKitType}`);
          continue;
        }

        data.forEach((record: any) => {
          allFetchedData.push({
            type: type,
            value: record.value,
            unit: record.unit,
            date: record.startDate, // HealthKit returns startDate for the record
          });
        });
      } catch (error) {
        console.error(`Error fetching ${type} from HealthKit:`, error);
      }
    }
    return allFetchedData;
  },
};

export default HealthDataService;