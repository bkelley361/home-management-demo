export type VehicleIdentity = {
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
};

export type GeneralIdentity = {
  name: string;
  categoryName: string;
  legacyKind?: string;
  brand?: string;
  model_number?: string;
  /** ms epoch; used to describe the unit's approximate age. */
  install_date?: number;
  serial_number?: string;
  location_in_home?: string;
};

export type PartsLookupRequest =
  | {
      assetType: 'vehicle';
      query: string;
      vehicle: VehicleIdentity;
    }
  | {
      assetType: 'general';
      query: string;
      general: GeneralIdentity;
    };

export type PartConfidence = 'high' | 'medium' | 'low';

export type PartCandidate = {
  part_name: string;
  part_number?: string;
  brand?: string;
  notes?: string;
  confidence: PartConfidence;
};

export type PartsLookupResult = {
  /** One-sentence direct answer, e.g. "Takes 0W-20 full synthetic, 4.4 qt." */
  summary: string;
  specs: { label: string; value: string }[];
  parts: PartCandidate[];
  shopping_links: { label: string; url: string }[];
  caveat?: string;
  cached?: boolean;
  grounded?: boolean;
};

export class SubscriptionRequiredError extends Error {
  constructor(message = 'An active subscription is required for parts lookup.') {
    super(message);
    this.name = 'SubscriptionRequiredError';
  }
}

function mockPartsResult(input: PartsLookupRequest): PartsLookupResult {
  const isVehicle = input.assetType === 'vehicle';
  const name = isVehicle
    ? `${input.vehicle.year} ${input.vehicle.make} ${input.vehicle.model}`
    : input.general.name;

  return {
    summary: isVehicle
      ? `Specifications for ${name}: Recommended oil is 0W-20 Full Synthetic (4.4 qt). Standard oil filter is 15400-PLM-A02.`
      : `Recommended specs for ${name}: Air filter size is 20x25x4 (MERV 11). Replace every 90 days.`,
    specs: isVehicle
      ? [
          { label: 'Oil Viscosity', value: '0W-20 Full Synthetic' },
          { label: 'Oil Capacity', value: '4.4 Quarts (with filter)' },
          { label: 'Oil Filter Part #', value: '15400-PLM-A02' },
          { label: 'Change Interval', value: '7,500 miles / 12 months' },
        ]
      : [
          { label: 'Filter Dimensions', value: '20" x 25" x 4"' },
          { label: 'Efficiency Rating', value: 'MERV 11' },
          { label: 'Filter Part #', value: 'FILXXCAR0020' },
          { label: 'Replacement Interval', value: 'Every 90 days' },
        ],
    parts: [
      {
        part_name: isVehicle ? 'Genuine Engine Oil Filter' : '20x25x4 MERV 11 Media Filter',
        part_number: isVehicle ? '15400-PLM-A02' : 'FILXXCAR0020',
        brand: isVehicle ? 'Honda OEM' : 'Carrier',
        confidence: 'high',
        notes: 'Factory OEM direct replacement fitment.',
      },
      {
        part_name: isVehicle
          ? 'Full Synthetic Motor Oil 0W-20 (5 Qt)'
          : 'Allergen Defense Air Filter (2-Pack)',
        part_number: isVehicle ? '08798-9034' : 'FILBBCAR0020',
        brand: isVehicle ? 'Honda Ultimate' : 'Carrier',
        confidence: 'high',
        notes: 'High-mileage & standard synthetic compatible.',
      },
    ],
    shopping_links: [
      { label: 'Search on Amazon', url: 'https://www.amazon.com' },
      { label: 'Manufacturer Direct', url: 'https://google.com' },
    ],
    caveat:
      'Demo Mode: Mocked specifications returned for local testing without external API calls.',
    cached: true,
  };
}

/**
 * Run a parts lookup in demo mode. Returns simulated specifications.
 */
export async function lookupParts(
  input: PartsLookupRequest,
  _authToken?: string
): Promise<PartsLookupResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockPartsResult(input);
}

/** Quick-pick part questions, by asset type and category compatibility key. */
export function quickPicks(assetType: 'vehicle' | 'general', legacyKind?: string): string[] {
  if (assetType === 'vehicle') {
    return [
      'Engine oil',
      'Oil filter',
      'Engine air filter',
      'Cabin air filter',
      'Wiper blades',
      'Battery',
      'Tire size',
      'Brake pads',
      'Spark plugs',
    ];
  }

  switch (legacyKind) {
    case 'hvac':
      return ['Filter size', 'Thermostat wiring', 'Capacitor', 'Contactor', 'Refrigerant type'];
    case 'refrigerator':
      return ['Water filter', 'Air filter', 'Door gasket', 'Ice maker assembly'];
    case 'water_heater':
      return ['Anode rod', 'Heating element', 'T&P relief valve', 'Dip tube'];
    case 'dishwasher':
      return ['Filter assembly', 'Spray arm', 'Door seal', 'Water inlet valve'];
    case 'washer':
      return ['Water inlet valve', 'Drain pump', 'Door boot seal', 'Drive belt'];
    case 'dryer':
      return ['Lint screen', 'Thermal fuse', 'Drive belt', 'Heating element'];
    default:
      return ['Filter size', 'Replacement battery', 'Belts', 'Bulbs/Fuses', 'Consumables'];
  }
}
