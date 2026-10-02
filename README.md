# three-ue-controls

Camera controls for three.js that feel and work like Unreal Engine's editor viewport. If you know how to fly around a level in Unreal, you already know how to use these: hold the right mouse button to look, WASD to move, E and Q to rise and fall, and scroll while holding the button to change speed. The camera eases in and glides to a stop the way Unreal's does. Trackpads look around with two fingers and move with a pinch.

**[Try the demo](https://aidannewsome.github.io/three-ue-controls/)**

Not affiliated with or endorsed by Epic Games. Unreal Engine is a trademark of Epic Games, Inc.

## Install

    npm install three-ue-controls

three.js r170 or later is needed alongside it.

## Use

```js
import { UEControls } from 'three-ue-controls';

const controls = new UEControls( camera, renderer.domElement );

renderer.setAnimationLoop( () => {

	timer.update();
	controls.update( timer.getDelta() );
	renderer.render( scene, camera );

} );
```

`controls.update( delta )` must run every frame: movement accelerates and is damped. Listen for `change` to render only when the camera moves.

## Controls

| Input | What it does |
| --- | --- |
| Right drag | Look around |
| W A S D, arrow keys | Move forward, back and sideways |
| E, Q | Move up and down |
| R, F | Move up and down along the camera's own up |
| Z, C | Widen and narrow the field of view, springing back when let go |
| Scroll | Move forward and back |
| Scroll while holding a button | Change speed |
| Left drag | Move forward along the ground and turn |
| Middle drag, or left and right together | Pan |
| Trackpad, two fingers | Look around |
| Trackpad, pinch | Move forward and back |
| Trackpad, two fingers while pressed | Pan |

## Differences from Unreal

- The keys work without holding a mouse button, so laptop users can fly with the trackpad and keyboard alone. If your users are on a mouse and you want Unreal's default, where the keys fly only while a button is held, set `holdToFly = true`.
- Browsers do not say whether a scroll came from a trackpad, so the controls guess from its size and direction. If you know a better way, pull requests are welcome.

## Settings

Every setting is a property, changed at any time, the way three's own controls work:

```js
controls.speed = 4;              // four times as fast
controls.holdToFly = true;       // keys fly only while a mouse button is held, as Unreal's default
controls.keys.UP = [ 'Space' ];  // rebind a key
```

| Property | Default | What it does |
| --- | --- | --- |
| `speed` | `1` | Multiplier on every movement. Scrolling while a button is held changes it. |
| `minSpeed`, `maxSpeed` | `0.00001`, `10000` | The range scrolling keeps `speed` in. |
| `speedStep` | `0.1` | Share of `speed` one scroll notch adds or takes away. |
| `acceleration` | `200` | How fast a held key speeds the camera up, in m/s² at speed 1. |
| `damping` | `10` | How fast the camera slows, per second. With `acceleration` it sets the top speed, about 17 m/s. |
| `lookSpeed` | `0.2°` | How far the view turns per pixel, in radians. |
| `dragSpeed` | `0.01` | Metres per pixel for left and middle drags, at speed 1. |
| `wheelStep` | `0.96` | Metres one scroll notch moves the camera. |
| `gestureLookSpeed` | `0.35°` | How far a two finger scroll turns the view per pixel, in radians. |
| `gestureCurve` | `20` | Below this many pixels a two finger scroll turns by its square, so small movements are gentle. |
| `pinchSpeed` | `4` | How hard a pinch pushes the camera. |
| `fovAcceleration`, `fovDamping` | `1200`, `10` | How Z and C change the field of view. |
| `minFov`, `maxFov` | `5`, `170` | The field of view's range, in degrees across the view as Unreal measures it, not up and down as three's `camera.fov` does. |
| `minPolarAngle`, `maxPolarAngle` | `0`, `Math.PI` | How far the view can look down and up, in radians. |
| `enableKeys` | `true` | Whether the keyboard moves the camera at all. |
| `holdToFly` | `false` | If `true`, the letter keys fly only while a mouse button is held or a trackpad is in use. |
| `keys` | W A S D, E Q, R F, Z C | The bindings, by `KeyboardEvent.code`, each a list. |
| `enabled` | `true` | Turns the controls off without removing them. |

Read only: `velocity`, the camera's velocity in m/s, and `isTrackpad`, whether the last scroll looked like a trackpad's.

## Development

To run the demo locally and work on the controls:

    git clone https://github.com/aidannewsome/three-ue-controls.git
    cd three-ue-controls
    npm install
    npm run dev

## License

MIT
