import { beforeEach, describe, expect, it } from 'vitest';
import { storeAudio } from '@/shared/audio/store';
import { testWebm } from '@/shared/audio/test-audio';
import { adminActor, agentActor, customerActor } from '@/shared/db/test/actors';
import { makeAddress, makeOrder, truncateAll } from '@/shared/db/test/helpers';
import { handleGeoReverse, handleGeoSearch, handleVoiceNote, type Viewer } from './handlers';

beforeEach(truncateAll);

const url = (path: string) => new URL(`http://localhost${path}`);

describe('geo route handlers (contracts/routes.md)', () => {
  it('needs a customer or admin session', async () => {
    expect((await handleGeoSearch(url('/api/geo/search?q=bus'), {})).status).toBe(401);
    const agent = await agentActor();
    expect((await handleGeoReverse(url('/api/geo/reverse?lat=14.28&lng=74.44'), { agent })).status).toBe(401);
  });

  it('validates the query and fails closed with 400', async () => {
    const customer = await customerActor();
    for (const path of ['/api/geo/search?q=ab', `/api/geo/search?q=${'x'.repeat(101)}`, '/api/geo/search', '/api/geo/search?q=bus&locale=fr']) {
      expect((await handleGeoSearch(url(path), { customer })).status, path).toBe(400);
    }
    for (const path of ['/api/geo/reverse?lat=40&lng=74.4', '/api/geo/reverse?lat=14.2&lng=120', '/api/geo/reverse?lat=x&lng=74']) {
      expect((await handleGeoReverse(url(path), { customer })).status, path).toBe(400);
    }
  });

  it('returns places and the address under a pin from the geocoder (stand-in in tests)', async () => {
    const customer = await customerActor();
    const search = await handleGeoSearch(url('/api/geo/search?q=bus%20stand&locale=en'), { customer });
    expect(search.status).toBe(200);
    expect(search.headers.get('Cache-Control')).toBe('no-store');
    const body = (await search.json()) as { places: { label: string }[] };
    expect(body.places[0]!.label).toContain('bus stand');
    const admin = await adminActor();
    const reverse = await handleGeoReverse(url('/api/geo/reverse?lat=14.2796&lng=74.4439&locale=kn'), { admin });
    expect(((await reverse.json()) as { label: string }).label).toContain('ಹತ್ತಿರ');
  });
});

describe('voice note route (FR-055)', () => {
  async function setup() {
    const stored = await storeAudio(testWebm(), 'audio/webm');
    if (!stored.ok) throw new Error();
    const owner = await customerActor();
    await makeAddress(owner.customerId, { voiceNoteId: stored.data.id });
    return { clipId: stored.data.id, owner };
  }

  it('plays the clip for its owner with a private cache header', async () => {
    const { clipId, owner } = await setup();
    const response = await handleVoiceNote(clipId, { customer: owner });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/webm');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(testWebm());
  });

  it('is not found for another customer, a signed-out request or an agent without the order', async () => {
    const { clipId } = await setup();
    const viewers: Viewer[] = [{ customer: await customerActor() }, {}, { agent: await agentActor() }];
    for (const viewer of viewers) expect((await handleVoiceNote(clipId, viewer)).status).toBe(404);
    expect((await handleVoiceNote('not-a-uuid', {})).status).toBe(404);
  });

  it('plays for the agent holding an unfinished order that uses it, and for any admin', async () => {
    const { clipId } = await setup();
    const agent = await agentActor();
    await makeOrder({ status: 'ready', agentId: agent.agentId, voiceNoteId: clipId });
    expect((await handleVoiceNote(clipId, { agent })).status).toBe(200);
    expect((await handleVoiceNote(clipId, { admin: await adminActor() })).status).toBe(200);

    const finishedAgent = await agentActor();
    await makeOrder({ status: 'delivered', agentId: finishedAgent.agentId, voiceNoteId: clipId });
    expect((await handleVoiceNote(clipId, { agent: finishedAgent })).status).toBe(404);
  });
});
