import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const fetchMock = vi.fn();

describe('createTrackingMoreShipment', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('TRACKINGMORE_API_KEY', 'test-key');
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test('returns existing tracking when TrackingMore reports duplicate number', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ meta: { message: 'Tracking No. already exists.' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            delivery_status: 'in_transit',
            courier_code: 'kerryexpress-th',
          },
        }),
      });

    const { createTrackingMoreShipment } = await import('@/lib/bean-orders/trackingmore');
    const result = await createTrackingMoreShipment({
      trackingNumber: 'KEX1234567890',
      carrierCode: 'kerryexpress-th',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        data: {
          delivery_status: 'in_transit',
          courier_code: 'kerryexpress-th',
        },
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test('still logs unexpected create failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ meta: { message: 'Invalid courier code' } }),
    });

    const { createTrackingMoreShipment } = await import('@/lib/bean-orders/trackingmore');
    const result = await createTrackingMoreShipment({
      trackingNumber: 'KEX1234567890',
      carrierCode: 'kerryexpress-th',
    });

    expect(result.ok).toBe(false);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
