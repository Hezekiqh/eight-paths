import { ARROW_H, GAP, HOLE_PAD, TOUR_STEPS, placeTour } from '../steps';

const screen = { width: 390, height: 844 };

describe('placeTour', () => {
  it('puts the box under a target in the top half, arrow pointing up', () => {
    const out = placeTour({ x: 20, y: 120, width: 350, height: 200 }, screen);
    expect(out.arrow.dir).toBe('up');
    expect(out.hole).toEqual({
      x: 20 - HOLE_PAD,
      y: 120 - HOLE_PAD,
      width: 350 + HOLE_PAD * 2,
      height: 200 + HOLE_PAD * 2,
    });
    expect(out.arrow.y).toBe(320 + HOLE_PAD + GAP);
    expect(out.box).toEqual({ top: out.arrow.y + ARROW_H + GAP });
  });

  it('puts the box over a target in the bottom half, arrow pointing down', () => {
    const tab = { x: 90, y: 790, width: 24, height: 24 };
    const out = placeTour(tab, screen);
    expect(out.arrow.dir).toBe('down');
    expect(out.arrow.y + ARROW_H).toBeLessThanOrEqual(out.hole.y);
    expect('bottom' in out.box && out.box.bottom).toBeGreaterThan(screen.height - out.hole.y);
    expect(out.arrow.x).toBeCloseTo(tab.x + tab.width / 2);
  });

  it('frames only the part of a target that is on screen', () => {
    const out = placeTour({ x: 20, y: 700, width: 350, height: 400 }, screen);
    expect(out.hole.y + out.hole.height).toBeLessThanOrEqual(screen.height);
  });

  it('keeps the arrow off the screen edge', () => {
    const out = placeTour({ x: 0, y: 40, width: 10, height: 10 }, screen);
    expect(out.arrow.x).toBeGreaterThanOrEqual(16);
  });
});

describe('TOUR_STEPS', () => {
  it('starts on Today with the Keeper speaking, pointing at nothing', () => {
    expect(TOUR_STEPS[0].route).toBe('/');
    expect(TOUR_STEPS[0].target).toBeUndefined();
  });

  it('ends at the door into the Other World', () => {
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(last.route).toBe('/world');
    expect(last.target).toBe('step-outside');
  });

  it('makes a habit, comes back to Today, then visits each tab once, in tab-bar order', () => {
    const visited = TOUR_STEPS.map((s) => s.route).filter((r, i, all) => r !== all[i - 1]);
    expect(visited).toEqual(['/', '/quest-editor', '/', '/character', '/social-tab', '/journey', '/world']);
  });

  it('explains all eight Paths in the habit creator', () => {
    const said = TOUR_STEPS.filter((s) => s.route === '/quest-editor')
      .map((s) => s.line)
      .join(' ');
    for (const cls of ['Warrior', 'Noble', 'Mage', 'Cleric', 'Monk', 'Bard', 'Artificer', 'Ranger'])
      expect(said).toContain(cls);
  });

  it('completes the first habit together, then celebrates the first hero', () => {
    const at = TOUR_STEPS.findIndex((s) => s.complete === 'first-quest');
    expect(TOUR_STEPS[at].target).toBe('first-quest');
    expect(TOUR_STEPS[at + 1].line).toContain('{hero}');
    expect(TOUR_STEPS[at + 1].line).toContain('{left} heroes to go');
  });
});
