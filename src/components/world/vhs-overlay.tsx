import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';

// The World seen through an old tape (VOICE.md, "the dark turn"): a cold,
// dark grade, scanlines, a vignette, grain, and a tracking band that rolls
// slowly down the screen. It sits over the world and under the text box and
// controls, so words stay crisp. The Archive is the one warm room: it gets an
// amber grade and barely any dark. It updates at 12 fps, like cheap tape, which
// also keeps it from rebuilding the shader every frame.

const FPS = 12;

const VHS = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float warm;

half4 main(float2 p) {
  float2 uv = p / res;
  // scanlines, one dark line every 3px
  float scan = 0.5 + 0.5 * sin(p.y * 2.0944);
  float a = (1.0 - scan) * 0.12;
  // vignette, heavier at the corners
  float2 c = (uv - 0.5) * float2(1.0, 1.25);
  a += smoothstep(0.3, 0.8, length(c)) * mix(0.6, 0.35, warm);
  // grain, re-rolled twelve times a second
  float n = fract(sin(dot(floor(p / 2.0) + floor(t * 12.0), float2(12.9898, 78.233))) * 43758.5453);
  a += (n - 0.5) * 0.05;
  // the tracking band: a soft pale smear rolling down every twenty seconds
  float band = smoothstep(0.035, 0.0, abs(uv.y - fract(t * 0.05)));
  // the grade: cold violet-dark outside, amber in the Archive
  half3 col = mix(half3(0.05, 0.03, 0.09), half3(0.12, 0.06, 0.0), warm);
  col = mix(col, half3(0.85, 0.8, 0.9), band * 0.6);
  a = clamp(a + mix(0.2, 0.04, warm) + band * 0.07, 0.0, 0.85);
  return half4(col * a, a);
}
`)!;

export function VhsOverlay({ width, height, warm }: { width: number; height: number; warm: boolean }) {
  const still = useReducedMotion();
  // Reduced motion: no rolling band or crawling grain, just the frozen frame.
  const uniforms = useSharedValue({ res: [width, height], t: 3, warm: warm ? 1 : 0 });
  const tick = useSharedValue(-1);
  useFrameCallback((frame) => {
    const now = Math.floor((frame.timeSinceFirstFrame * FPS) / 1000);
    if (now === tick.value) return;
    tick.value = now;
    uniforms.value = { res: [width, height], t: 3 + now / FPS, warm: warm ? 1 : 0 };
  }, !still);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={VHS} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
