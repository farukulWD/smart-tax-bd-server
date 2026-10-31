import { ISettings } from './settings.interface';
import { Settings } from './settings.model';
import { SETTINGS_KEY } from './settings.constant';

/** Returns the settings document, creating it with defaults on first read. */
const getSettingsFromDB = async () => {
  const result = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return result;
};

const updateSettingsInDB = async (payload: Pick<ISettings, 'service_fee'>) => {
  const result = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { service_fee: payload.service_fee } },
    { new: true, upsert: true, runValidators: true },
  );
  return result;
};

/** Fee charged on new tax orders. Existing orders keep the fee they were created with. */
const getServiceFee = async () => {
  const settings = await getSettingsFromDB();
  return settings.service_fee;
};

export const SettingsService = {
  getSettingsFromDB,
  updateSettingsInDB,
  getServiceFee,
};
