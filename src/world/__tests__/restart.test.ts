import { initialData, useGameStore } from '@/store';

import { FRESH_WORLD, useWorldStore } from '../store';

describe('restarting the Other World', () => {
  beforeEach(() => {
    useGameStore.setState(initialData);
    useWorldStore.setState({
      controls: 'touchpad',
      hero: 'moss',
      position: { map: 'warrior-city', x: 40, y: 80, facing: 'up' },
      discovered: ['archive', 'courier-road', 'warrior-city'],
      heard: [{ id: 'gert:0', speaker: 'Gert', lines: ['Yeah, we know.'] }] as never,
      flags: ['kaldor-beaten', 'season-1', 'brawl-over'],
      noticed: ['exit:town-keep'],
      candles: [{ map: 'courier-road', x: 3, y: 3, facing: 'down' }],
      lastCandle: 'courier-road',
      barrageDay: '2026-10-02',
    });
  });

  it('forgets everything that happened in the game', () => {
    useWorldStore.getState().restart();
    const s = useWorldStore.getState();
    for (const [key, value] of Object.entries(FRESH_WORLD)) expect(s[key as keyof typeof s]).toEqual(value);
  });

  it('keeps the controls and who walks the World', () => {
    useWorldStore.getState().restart();
    expect(useWorldStore.getState().controls).toBe('touchpad');
    expect(useWorldStore.getState().hero).toBe('moss');
  });

  it('never touches the habit save', () => {
    const before = useGameStore.getState();
    useWorldStore.getState().restart();
    expect(useGameStore.getState()).toBe(before);
  });
});
