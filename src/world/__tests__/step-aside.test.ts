import { STEP_ASIDE_SECONDS, cameoAt, newCameo } from '../step-aside';

/** Plays a cameo frame by frame for `seconds`, returning the last pose. */
function play(cameo: number[], seconds: number) {
  let c = cameo;
  let pose = cameoAt(c, 0);
  for (let s = 0; s < seconds; s += 1 / 60) {
    pose = cameoAt(c, 1 / 60);
    c = [...c.slice(0, 8), pose[0]];
  }
  return pose;
}

describe('stepping aside for a field move', () => {
  // A walker at (100, 200) facing up (1), toward a cracked wall.
  const cameo = newCameo(5, 100, 200, 1);

  it('starts the helper behind the walker and ends them where the walker stood', () => {
    expect(cameo.slice(1, 5)).toEqual([100, 216, 100, 200]);
  });

  it('has the walker sidestep a quarter turn from the way they face', () => {
    const [, ax, ay] = play(cameo, STEP_ASIDE_SECONDS);
    expect(Math.abs(ax) + Math.abs(ay)).toBe(14);
    expect(ay).toBe(0);
  });

  it('shows the helper only once the walker has moved, and lands them facing the job', () => {
    expect(cameoAt(cameo, 0.05)[6]).toBe(0);
    const end = play(cameo, STEP_ASIDE_SECONDS + 0.1);
    expect(end[0]).toBe(1);
    expect(end.slice(3, 7)).toEqual([100, 200, 0, 1]);
  });
});
