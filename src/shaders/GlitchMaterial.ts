import * as THREE from 'three';

// Three.js ShaderMaterial automatically provides these built-ins:
// attributes: position, uv
// uniforms: projectionMatrix, modelViewMatrix

const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;

  // Deterministic pseudo-random from a float seed
  float rand(float seed) {
    return fract(sin(seed) * 43758.5453);
  }

  void main() {
    // --- Blocky horizontal glitch ---
    // Divide the face into 10 horizontal bands. Each band gets a random
    // lateral shift that snaps to a new value 8 times per second.
    float band     = floor(vUv.y * 10.0);
    float tick     = floor(uTime * 8.0);
    float shift    = (rand(band + tick) * 2.0 - 1.0) * 0.07;
    // Only glitch ~18 % of bands at any given tick
    shift         *= step(0.82, rand(band + tick * 0.73));

    // --- Continuous sinusoidal warp ---
    float warpX = sin(vUv.y * 22.0 + uTime * 7.3) * 0.018;
    float warpY = sin(vUv.x * 17.0 + uTime * 5.1) * 0.012;

    vec2 uv = vec2(vUv.x + shift + warpX, vUv.y + warpY);

    // --- Base color: #ff2244 → rgb(1.0, 0.133, 0.267) ---
    vec3 color = vec3(1.0, 0.133, 0.267);

    // --- Multi-harmonic flicker ---
    float flicker = 0.78
      + 0.12 * sin(uTime * 29.1)
      + 0.10 * sin(uTime * 47.3 + 1.7);

    // --- Scanlines: thin dark horizontal bands ---
    float scan = 1.0 - 0.18 * step(0.55, fract(uv.y * 18.0));

    color *= flicker * scan;

    // --- Sparse bright stripe flash ---
    // A different set of bands fires every ~1/6 s
    float stripeKey   = floor(vUv.y * 14.0) + floor(uTime * 6.0);
    float stripeFlash = step(0.94, rand(stripeKey));
    color = mix(color, vec3(1.0, 0.6, 0.7), stripeFlash);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class GlitchMaterial extends THREE.ShaderMaterial {
  private elapsedTime = 0;

  public constructor() {
    super({
      uniforms: {
        uTime: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
    });
  }

  public update(elapsed: number): void {
    (this.uniforms as { uTime: THREE.IUniform<number> }).uTime.value = elapsed;
  }
}
