import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoller } from './poller';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createPoller (research R3)', () => {
  it('runs every interval while visible', async () => {
    const run = vi.fn(async () => {});
    const poller = createPoller({ run, intervalMs: 10_000, isVisible: () => true });
    poller.start();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(run).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(run).toHaveBeenCalledTimes(3);
    poller.stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('skips ticks while hidden', async () => {
    let visible = false;
    const run = vi.fn(async () => {});
    const poller = createPoller({ run, intervalMs: 10_000, isVisible: () => visible });
    poller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).not.toHaveBeenCalled();
    visible = true;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it('runs once immediately when the page becomes visible again', async () => {
    let visible = false;
    const run = vi.fn(async () => {});
    const poller = createPoller({ run, intervalMs: 10_000, isVisible: () => visible });
    poller.start();
    visible = true;
    poller.onVisibilityChange();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it('never starts a run while one is still in flight', async () => {
    let finish: () => void = () => {};
    const run = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const poller = createPoller({ run, intervalMs: 10_000, isVisible: () => true });
    poller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('keeps polling after a failed run', async () => {
    const run = vi.fn(async () => {
      throw new Error('offline');
    });
    const poller = createPoller({ run, intervalMs: 10_000, isVisible: () => true });
    poller.start();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(run).toHaveBeenCalledTimes(2);
    poller.stop();
  });
});
