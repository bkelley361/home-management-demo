import type { GeneralIdentity, PartCandidate, VehicleIdentity } from '@/lib/parts-lookup';

/**
 * Deterministic vendor search URLs.
 *
 * Kept separate from lib/parts-lookup.ts because the API route
 * (app/api/parts-lookup+api.ts) needs these and must not pull in
 * `expo-constants`, which that module imports for dev base-URL resolution.
 *
 * These links are NEVER model-generated. A hallucinated URL is a 404 the user
 * has to debug, so every one is assembled from the asset's own fields.
 */

export function vehicleLabel(v: VehicleIdentity): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
}

export function generalLabel(asset: GeneralIdentity): string {
  return [asset.name, asset.brand, asset.model_number].filter(Boolean).join(' ');
}

/** The three vendor searches offered for a lookup result. */
export function vendorLinks(
  assetType: 'vehicle' | 'general',
  asset: VehicleIdentity | GeneralIdentity,
  searchTerm: string
): { label: string; url: string }[] {
  const q = encodeURIComponent;

  if (assetType === 'vehicle' && 'year' in asset) {
    const search = `${vehicleLabel(asset)} ${searchTerm}`;
    return [
      { label: 'RockAuto', url: `https://www.rockauto.com/en/partsearch/?partsearch=${q(search)}` },
      { label: 'AutoZone', url: `https://www.autozone.com/searchresult?searchText=${q(search)}` },
      { label: "O'Reilly", url: `https://www.oreillyauto.com/search?q=${q(search)}` },
    ];
  }

  if (assetType !== 'general' || !('categoryName' in asset)) return [];
  const general = asset;
  if (general.legacyKind) {
    const applianceSearch = [general.brand, general.model_number, searchTerm]
      .filter(Boolean)
      .join(' ');
    return [
      {
        label: 'PartSelect',
        url: `https://www.partselect.com/Search/?SearchTerm=${q(applianceSearch)}`,
      },
      {
        label: 'RepairClinic',
        url: `https://www.repairclinic.com/Shop-For-Parts?query=${q(applianceSearch)}`,
      },
      {
        label: 'AppliancePartsPros',
        url: `https://www.appliancepartspros.com/search.aspx?model=${q(general.model_number ?? '')}&q=${q(searchTerm)}`,
      },
    ];
  }

  const search = [
    general.name,
    general.categoryName,
    general.brand,
    general.model_number,
    searchTerm,
  ]
    .filter(Boolean)
    .join(' ');
  return [{ label: 'Google', url: `https://www.google.com/search?q=${q(search)}` }];
}

/**
 * Link to store on a saved part. Searches for the specific part number when the
 * lookup was confident enough to return one — that's the point of saving the
 * part — and falls back to the original question otherwise.
 */
export function savedPartLink(
  assetType: 'vehicle' | 'general',
  asset: VehicleIdentity | GeneralIdentity,
  part: PartCandidate,
  fallbackQuery: string
): string | undefined {
  const term = part.part_number
    ? `${part.part_number} ${part.part_name}`
    : `${part.part_name} ${fallbackQuery}`;
  return vendorLinks(assetType, asset, term)[0]?.url;
}

/**
 * Search for a manufacturer's product-registration page.
 *
 * No API maps a brand to its registration URL, and guessing a hostname
 * (`brand.com/register`) 404s often enough to be worse than useless — so this
 * deliberately returns a search, which always resolves to something usable.
 */
export function registrationSearchLink(brand: string, modelNumber?: string): string {
  const term = [brand, modelNumber, 'product registration warranty'].filter(Boolean).join(' ');
  return `https://duckduckgo.com/?q=${encodeURIComponent(term)}`;
}
