export type ScannedAssetData = {
  detected_type: 'vehicle' | 'general';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  // Vehicle fields
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  // General asset fields
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  suggested_name?: string | null;
  suggested_category?: string | null;
  manufacture_date?: string | null;
  specs?: string | null;
};

/**
 * Scan an appliance tag, HVAC label, or vehicle VIN sticker.
 * Simulates intelligent tag recognition locally for demo mode.
 */
export async function scanAssetTag(params: {
  imageBase64: string;
  mimeType?: string;
  authToken?: string;
  hintAssetType?: 'vehicle' | 'general';
}): Promise<ScannedAssetData> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (params.hintAssetType === 'vehicle') {
    return {
      detected_type: 'vehicle',
      confidence: 'high',
      summary: '2022 Honda CR-V EX-L (Scanned from VIN sticker)',
      vin: '7FARW2H84NE019284',
      year: 2022,
      make: 'Honda',
      model: 'CR-V',
      trim: 'EX-L AWD',
    };
  }

  return {
    detected_type: 'general',
    confidence: 'high',
    summary: 'Carrier Performance Series Heat Pump (Scanned from equipment label)',
    brand: 'Carrier',
    model_number: '25TPB736A003',
    serial_number: '3222E49102',
    suggested_name: 'Carrier Heat Pump',
    suggested_category: 'HVAC & Climate',
    manufacture_date: '2022-08-10',
    specs: '3-Ton 17 SEER2 Two-Stage Heat Pump',
  };
}
