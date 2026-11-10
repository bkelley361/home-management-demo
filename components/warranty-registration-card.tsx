import { ExternalLink } from 'lucide-react-native';
import { Linking, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatCents } from '@/lib/money';
import { WARRANTY_LEAD_DAYS } from '@/lib/reminders';
import { registrationSearchLink } from '@/lib/vendor-links';

const REGISTRATION_LABELS: Record<string, string> = {
  not_registered: 'Not registered',
  registered: 'Registered',
  not_applicable: "Doesn't apply",
};

const DAY_MS = 24 * 60 * 60 * 1000;

type WarrantyState = 'none' | 'active' | 'expiring' | 'expired';

/** Warranty status from an expiry date. Exported for the detail screens. */
export function warrantyState(expiresAt?: number | null, now = Date.now()): WarrantyState {
  if (!expiresAt) return 'none';
  if (expiresAt <= now) return 'expired';
  return expiresAt - now <= WARRANTY_LEAD_DAYS * DAY_MS ? 'expiring' : 'active';
}

type Props = {
  /** Brand for appliances, make for vehicles — used to build the search link. */
  brand: string;
  modelNumber?: string | null;
  warrantyExpiresAt?: number | null;
  purchaseDate?: number | null;
  purchasePriceCents?: number | null;
  registrationStatus?: string | null;
  registeredAt?: number | null;
  registrationConfirmation?: string | null;
};

/**
 * Read-only warranty / purchase / registration summary for a detail screen.
 *
 * Renders nothing at all when none of these fields are set, so it stays out of
 * the way for assets where the user hasn't filled them in. Editing happens on
 * the matching `edit.tsx` screen.
 */
export function WarrantyRegistrationCard({
  brand,
  modelNumber,
  warrantyExpiresAt,
  purchaseDate,
  purchasePriceCents,
  registrationStatus,
  registeredAt,
  registrationConfirmation,
}: Props) {
  const state = warrantyState(warrantyExpiresAt);
  const hasAnything =
    !!warrantyExpiresAt ||
    !!purchaseDate ||
    purchasePriceCents != null ||
    !!registrationStatus ||
    !!registeredAt;

  if (!hasAnything) return null;

  const expiryText = warrantyExpiresAt ? new Date(warrantyExpiresAt).toLocaleDateString() : null;

  return (
    <Card className="pb-4">
      <CardHeader className="gap-2">
        <CardTitle>Warranty &amp; registration</CardTitle>
        {state !== 'none' ? (
          <View className="flex-row flex-wrap gap-2">
            {state === 'expired' ? (
              <Badge variant="outline">
                <Text>Warranty expired</Text>
              </Badge>
            ) : state === 'expiring' ? (
              <Badge variant="destructive">
                <Text>Expires within {WARRANTY_LEAD_DAYS} days</Text>
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Text>Under warranty</Text>
              </Badge>
            )}
          </View>
        ) : null}
        {expiryText ? (
          <CardDescription>
            {state === 'expired' ? 'Expired' : 'Expires'} {expiryText}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="gap-1.5">
        {purchaseDate ? (
          <Text>Purchased: {new Date(purchaseDate).toLocaleDateString()}</Text>
        ) : null}
        {purchasePriceCents != null ? <Text>Price: {formatCents(purchasePriceCents)}</Text> : null}
        {registrationStatus ? (
          <Text>Registration: {REGISTRATION_LABELS[registrationStatus] ?? registrationStatus}</Text>
        ) : null}
        {registeredAt ? (
          <Text>Registered: {new Date(registeredAt).toLocaleDateString()}</Text>
        ) : null}
        {registrationConfirmation ? <Text>Confirmation #{registrationConfirmation}</Text> : null}

        {/* Offer the registration path only when they haven't done it yet. */}
        {registrationStatus !== 'registered' && registrationStatus !== 'not_applicable' ? (
          <Button
            variant="outline"
            className="mt-2 flex-row gap-2"
            onPress={() =>
              Linking.openURL(registrationSearchLink(brand, modelNumber ?? undefined))
            }>
            <Icon as={ExternalLink} className="size-4" />
            <Text>Register with {brand}</Text>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
