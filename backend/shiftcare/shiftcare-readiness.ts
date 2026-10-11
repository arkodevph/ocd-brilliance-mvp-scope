import { createShiftCareClient, ShiftCareError, shiftWindow } from './shiftcare.client';

type Client = ReturnType<typeof createShiftCareClient>;
type Resource = 'clients' | 'staff' | 'shifts';
interface ReadCheck {
  resource: Resource;
  connected: boolean;
  checkedAt?: string;
  code?: string;
  error?: string;
}

export async function checkShiftCareReadiness(client: Client, from: string, to: string) {
  if (!client.configuration.configured) {
    throw new ShiftCareError(
      503,
      'NOT_CONFIGURED',
      client.configuration.error || 'The ShiftCare connection is awaiting account credentials.',
    );
  }
  shiftWindow(from, to, client.configuration.timeZone);
  const reads = await Promise.all(
    (['clients', 'staff', 'shifts'] as const).map(async (resource): Promise<ReadCheck> => {
      try {
        const result = await client.list(resource, {
          per_page: 1,
          ...(resource === 'shifts' ? { from, to } : {}),
        });
        return { resource, connected: true, checkedAt: result.fetchedAt };
      } catch (error) {
        if (!(error instanceof ShiftCareError)) throw error;
        return {
          resource,
          connected: false,
          code: error.code,
          error: error.message,
        };
      }
    }),
  );
  return {
    accountId: client.configuration.accountId,
    timeZone: client.configuration.timeZone,
    checkedAt: new Date().toISOString(),
    readsReady: reads.every((check) => check.connected),
    readOnly: true,
    nativeWritesEnabled: false,
    liveLocationEnabled: false,
    reads,
  };
}
