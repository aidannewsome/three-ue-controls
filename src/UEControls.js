import {
	Controls,
	Euler,
	MathUtils,
	Vector3
} from 'three';

/**
 * Fires when the camera has been transformed by the controls.
 *
 * @event UEControls#change
 * @type {Object}
 */
const _changeEvent = { type: 'change' };

const _EPS = 0.000001;
const _PI_2 = Math.PI / 2;

const _euler = new Euler( 0, 0, 0, 'YXZ' );
const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _push = new Vector3();
const _lastPosition = new Vector3();

/**
 * Fly controls after the Unreal Editor's perspective viewport. Hold the right mouse button to look around, the left
 * to move forward and turn, the middle (or both left and right) to pan. W, A, S and D move, E and Q rise and fall in
 * world space, R and F in the camera's own, Z and C widen and narrow the field of view. The mouse wheel moves
 * forward and back, or changes the speed while a button is held. On a trackpad two fingers look around and a pinch
 * moves forward and back.
 *
 * Movement accelerates and is damped the way the editor's camera is, so it eases in and glides to a stop. Looking
 * around is direct. The camera never rolls, and its pitch stops short of straight up and straight down.
 *
 * Distances are in world units, taken as metres.
 *
 * ```js
 * const controls = new UEControls( camera, renderer.domElement );
 *
 * function animate() {
 *
 * 	controls.update( timer.getDelta() );
 * 	renderer.render( scene, camera );
 *
 * }
 * ```
 *
 * @augments Controls
 */
class UEControls extends Controls {

	/**
	 * Constructs a new controls instance.
	 *
	 * @param {PerspectiveCamera} camera - The camera that is managed by the controls.
	 * @param {?HTMLElement} domElement - The HTML element used for event listeners.
	 */
	constructor( camera, domElement = null ) {

		super( camera, domElement );

		/**
		 * The camera speed, a multiplier on every movement. The mouse wheel changes it by `speedStep` while a button
		 * is held.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.speed = 1;

		/**
		 * The slowest the camera speed can be set to.
		 *
		 * @type {number}
		 * @default 0.00001
		 */
		this.minSpeed = 0.00001;

		/**
		 * The fastest the camera speed can be set to.
		 *
		 * @type {number}
		 * @default 10000
		 */
		this.maxSpeed = 10000;

		/**
		 * The share of the camera speed one notch of the mouse wheel adds or takes away.
		 *
		 * @type {number}
		 * @default 0.1
		 */
		this.speedStep = 0.1;

		/**
		 * How fast a held key accelerates the camera at speed 1, in units per second squared.
		 *
		 * @type {number}
		 * @default 200
		 */
		this.acceleration = 200;

		/**
		 * How fast the camera loses its velocity, in velocities per second. Together with `acceleration` it sets the
		 * top speed, about 17 units per second at speed 1.
		 *
		 * @type {number}
		 * @default 10
		 */
		this.damping = 10;

		/**
		 * How far the view turns per pixel the pointer moves, in radians.
		 *
		 * @type {number}
		 * @default 0.2 degrees
		 */
		this.lookSpeed = 0.2 * MathUtils.DEG2RAD;

		/**
		 * How far a drag with the left or the middle button moves the camera per pixel at speed 1.
		 *
		 * @type {number}
		 * @default 0.01
		 */
		this.dragSpeed = 0.01;

		/**
		 * How far one notch of the mouse wheel moves the camera. It does not follow the camera speed.
		 *
		 * @type {number}
		 * @default 0.96
		 */
		this.wheelStep = 0.96;

		/**
		 * How far the view turns per pixel of a two finger scroll on a trackpad, in radians. Small movements turn
		 * less, see `gestureCurve`.
		 *
		 * @type {number}
		 * @default 0.35 degrees
		 */
		this.gestureLookSpeed = 0.35 * MathUtils.DEG2RAD;

		/**
		 * Below this many pixels per event a two finger scroll turns the view by the square of its movement, so
		 * small movements are gentle and fine.
		 *
		 * @type {number}
		 * @default 20
		 */
		this.gestureCurve = 20;

		/**
		 * How hard a pinch pushes the camera, per unit of magnification.
		 *
		 * @type {number}
		 * @default 4
		 */
		this.pinchSpeed = 4;

		/**
		 * How fast a held Z or C changes the field of view, in degrees across the view per second squared.
		 *
		 * @type {number}
		 * @default 1200
		 */
		this.fovAcceleration = 1200;

		/**
		 * How fast the field of view loses its velocity, in velocities per second.
		 *
		 * @type {number}
		 * @default 10
		 */
		this.fovDamping = 10;

		/**
		 * The narrowest field of view, in degrees across the view, as Unreal measures it. three's `camera.fov` is up
		 * and down it.
		 *
		 * @type {number}
		 * @default 5
		 */
		this.minFov = 5;

		/**
		 * The widest field of view, in degrees across the view.
		 *
		 * @type {number}
		 * @default 170
		 */
		this.maxFov = 170;

		/**
		 * Camera pitch, lower limit. Range is '[0, Math.PI]' in radians.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.minPolarAngle = 0;

		/**
		 * Camera pitch, upper limit. Range is '[0, Math.PI]' in radians.
		 *
		 * @type {number}
		 * @default Math.PI
		 */
		this.maxPolarAngle = Math.PI;

		/**
		 * Whether the keyboard moves the camera at all.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enableKeys = true;

		/**
		 * If set to `true`, W, A, S, D, E, Q, R, F, Z and C only move the camera while a mouse button is held or a
		 * trackpad is in use, which leaves those keys free otherwise, as the Unreal Editor has it by default. The
		 * arrow keys always move it.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.holdToFly = false;

		/**
		 * The keys, by `KeyboardEvent.code`.
		 *
		 * @type {Object}
		 */
		this.keys = {
			FORWARD: [ 'KeyW' ], BACKWARD: [ 'KeyS' ], LEFT: [ 'KeyA' ], RIGHT: [ 'KeyD' ],
			UP: [ 'KeyE' ], DOWN: [ 'KeyQ' ], LOCAL_UP: [ 'KeyR' ], LOCAL_DOWN: [ 'KeyF' ],
			WIDEN: [ 'KeyZ' ], NARROW: [ 'KeyC' ]
		};

		/**
		 * The camera's velocity, in units per second.
		 *
		 * @type {Vector3}
		 * @readonly
		 */
		this.velocity = new Vector3();

		/**
		 * Whether the last wheel event looked like a trackpad's.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isTrackpad = false;

		// internals

		this._pressed = new Set();
		this._buttons = 0;
		this._modified = false;
		this._pinch = 0;
		this._fovVelocity = 0;
		this._fovBefore = - 1;
		this._moved = false;

		// event listeners

		this._onKeyDown = onKeyDown.bind( this );
		this._onKeyUp = onKeyUp.bind( this );
		this._onBlur = onBlur.bind( this );
		this._onPointerDown = onPointerDown.bind( this );
		this._onPointerMove = onPointerMove.bind( this );
		this._onPointerUp = onPointerUp.bind( this );
		this._onWheel = onWheel.bind( this );
		this._onContextMenu = onContextMenu.bind( this );

		if ( this.domElement !== null ) {

			this.connect( this.domElement );

		}

	}

	connect( element ) {

		super.connect( element );

		window.addEventListener( 'keydown', this._onKeyDown );
		window.addEventListener( 'keyup', this._onKeyUp );
		window.addEventListener( 'blur', this._onBlur );

		this.domElement.addEventListener( 'pointerdown', this._onPointerDown );
		this.domElement.addEventListener( 'pointermove', this._onPointerMove );
		this.domElement.addEventListener( 'pointerup', this._onPointerUp );
		this.domElement.addEventListener( 'pointercancel', this._onPointerUp );
		this.domElement.addEventListener( 'wheel', this._onWheel, { passive: false } );
		this.domElement.addEventListener( 'contextmenu', this._onContextMenu );

		this.domElement.style.touchAction = 'none'; // disable touch scroll

	}

	disconnect() {

		window.removeEventListener( 'keydown', this._onKeyDown );
		window.removeEventListener( 'keyup', this._onKeyUp );
		window.removeEventListener( 'blur', this._onBlur );

		this.domElement.removeEventListener( 'pointerdown', this._onPointerDown );
		this.domElement.removeEventListener( 'pointermove', this._onPointerMove );
		this.domElement.removeEventListener( 'pointerup', this._onPointerUp );
		this.domElement.removeEventListener( 'pointercancel', this._onPointerUp );
		this.domElement.removeEventListener( 'wheel', this._onWheel );
		this.domElement.removeEventListener( 'contextmenu', this._onContextMenu );

		this.domElement.style.touchAction = 'auto';

	}

	dispose() {

		this.disconnect();

	}

	/**
	 * Moves the camera by the keys held and its velocity. Call it every frame.
	 *
	 * @param {number} delta - The time in seconds since the last call.
	 */
	update( delta ) {

		if ( this.enabled === false ) return;

		delta = Math.min( delta, 1 ); // never teleport the camera after a long pause

		const camera = this.object;
		const flying = this._isFlying();
		const arrows = this.enableKeys && this._modified === false;
		const keys = arrows && ( this.holdToFly === false || flying );

		// the push of the keys: forward, right and local up in the camera's frame, world up in the world's

		const forward = this._key( keys, 'FORWARD', arrows, 'ArrowUp', 'Numpad8' ) - this._key( keys, 'BACKWARD', arrows, 'ArrowDown', 'Numpad2' ) + this._pinch;
		const right = this._key( keys, 'RIGHT', arrows, 'ArrowRight', 'Numpad6' ) - this._key( keys, 'LEFT', arrows, 'ArrowLeft', 'Numpad4' );
		const up = this._key( keys, 'UP', arrows, 'PageUp', 'Numpad9' ) - this._key( keys, 'DOWN', arrows, 'PageDown', 'Numpad7' );
		const localUp = this._key( keys, 'LOCAL_UP' ) - this._key( keys, 'LOCAL_DOWN' );
		const widen = this._key( keys, 'WIDEN', arrows, null, 'Numpad1' ) - this._key( keys, 'NARROW', arrows, null, 'Numpad3' );
		this._pinch = 0;

		camera.getWorldDirection( _forward );
		_right.set( 1, 0, 0 ).applyQuaternion( camera.quaternion );
		_up.set( 0, 1, 0 ).applyQuaternion( camera.quaternion );

		_push.set( 0, 0, 0 )
			.addScaledVector( _forward, forward )
			.addScaledVector( _right, right )
			.addScaledVector( _up, localUp );
		_push.y += up;

		// accelerate, then damp: the two balance at the top speed

		this.velocity.addScaledVector( _push, this.acceleration * this.speed * delta );
		this.velocity.multiplyScalar( 1 - Math.min( this.damping * delta, 0.75 ) );
		if ( this.velocity.lengthSq() < _EPS ) this.velocity.set( 0, 0, 0 );

		_lastPosition.copy( camera.position );
		camera.position.addScaledVector( this.velocity, delta );

		// the field of view, the same way, springing back once the keys are let go. Worked in Unreal's measure, across
		// the view, and handed back to three's, up and down it

		const fov = camera.fov;
		const across = getHorizontalFov( fov, camera.aspect );
		let next = across;

		if ( widen !== 0 && this._fovBefore < 0 ) this._fovBefore = across;

		this._fovVelocity += widen * this.fovAcceleration * delta;
		this._fovVelocity *= 1 - Math.min( this.fovDamping * delta, 0.75 );
		if ( Math.abs( this._fovVelocity ) < _EPS ) this._fovVelocity = 0;

		if ( this._fovVelocity !== 0 ) next = MathUtils.clamp( next + this._fovVelocity * delta, this.minFov, this.maxFov );

		const pushed = forward !== 0 || right !== 0 || up !== 0 || localUp !== 0 || widen !== 0;

		if ( this._fovBefore >= 0 && pushed === false && flying === false ) {

			this._fovVelocity = 0;

			const distance = Math.abs( next - this._fovBefore );

			if ( distance > 0.1 ) {

				next += Math.sign( this._fovBefore - next ) * distance * delta * 10;

			} else {

				next = this._fovBefore;
				this._fovBefore = - 1;

			}

		}

		if ( next !== across ) {

			camera.fov = getVerticalFov( next, camera.aspect );
			camera.updateProjectionMatrix();

		}

		if ( this._moved || _lastPosition.distanceToSquared( camera.position ) > _EPS || camera.fov !== fov ) {

			this._moved = false;
			this.dispatchEvent( _changeEvent );

		}

	}

	// internals

	_key( on, name, alsoOn = false, ...also ) {

		if ( on && this.keys[ name ].some( ( code ) => this._pressed.has( code ) ) ) return 1;
		if ( alsoOn && also.some( ( code ) => code !== null && this._pressed.has( code ) ) ) return 1;
		return 0;

	}

	_curve( delta ) {

		const size = Math.abs( delta );
		return size <= this.gestureCurve ? delta * size / this.gestureCurve : delta;

	}

	_changeSpeed( deltaY ) {

		const step = deltaY < 0 ? this.speedStep : - this.speedStep;
		this.speed = MathUtils.clamp( this.speed * ( 1 + step ), this.minSpeed, this.maxSpeed );

	}

	_isFlying() {

		return this._buttons !== 0 || this.isTrackpad;

	}

	_rotate( yaw, pitch ) {

		const camera = this.object;

		_euler.setFromQuaternion( camera.quaternion );

		_euler.y += yaw;
		_euler.x += pitch;
		_euler.z = 0;

		_euler.x = Math.max( _PI_2 - this.maxPolarAngle, Math.min( _PI_2 - this.minPolarAngle, _euler.x ) );

		camera.quaternion.setFromEuler( _euler );

		this._moved = true;

	}

	_move( x, y, z ) {

		this.object.position.x += x;
		this.object.position.y += y;
		this.object.position.z += z;

		this._moved = true;

	}

}

function getHorizontalFov( fov, aspect ) {

	return 2 * Math.atan( Math.tan( fov * MathUtils.DEG2RAD / 2 ) * aspect ) * MathUtils.RAD2DEG;

}

function getVerticalFov( fov, aspect ) {

	return 2 * Math.atan( Math.tan( fov * MathUtils.DEG2RAD / 2 ) / aspect ) * MathUtils.RAD2DEG;

}

function onKeyDown( event ) {

	if ( this.enabled === false ) return;

	this._pressed.add( event.code );
	this._modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

}

function onKeyUp( event ) {

	this._pressed.delete( event.code );
	this._modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

}

function onBlur() {

	this._pressed.clear();
	this._buttons = 0;
	this._modified = false;

}

function onPointerDown( event ) {

	if ( this.enabled === false ) return;

	this._buttons = event.buttons;
	this.domElement.setPointerCapture( event.pointerId );

	if ( event.button === 2 ) this.domElement.requestPointerLock?.(); // the cursor hides while looking around

}

function onPointerMove( event ) {

	this._buttons = event.buttons; // a second button pressed or let go while one is held comes as a move

	if ( this.enabled === false || this._buttons === 0 ) return;

	const left = ( this._buttons & 1 ) !== 0;
	const right = ( this._buttons & 2 ) !== 0;
	const middle = ( this._buttons & 4 ) !== 0;
	const x = event.movementX;
	const y = - event.movementY; // up the screen is positive
	const step = this.dragSpeed * this.speed;

	_euler.setFromQuaternion( this.object.quaternion, 'YXZ' );
	const yaw = _euler.y;

	if ( left && right === false ) {

		// forward and back along the ground, and turn

		this._move( - Math.sin( yaw ) * y * step, 0, - Math.cos( yaw ) * y * step );
		this._rotate( - x * this.lookSpeed, 0 );

	} else if ( middle && event.altKey === false ) {

		// pan in the camera's own frame

		_right.set( 1, 0, 0 ).applyQuaternion( this.object.quaternion );
		_up.set( 0, 1, 0 ).applyQuaternion( this.object.quaternion );
		this._move(
			( _right.x * x + _up.x * y ) * step,
			( _right.y * x + _up.y * y ) * step,
			( _right.z * x + _up.z * y ) * step
		);

	} else if ( left && right ) {

		// pan along the ground sideways and straight up

		this._move( Math.cos( yaw ) * x * step, y * step, - Math.sin( yaw ) * x * step );

	} else if ( right ) {

		this._rotate( - x * this.lookSpeed, y * this.lookSpeed );

	}

	if ( this._moved ) this.dispatchEvent( _changeEvent );
	this._moved = false;

}

function onPointerUp( event ) {

	this._buttons = event.buttons;

	if ( this.domElement.hasPointerCapture( event.pointerId ) ) this.domElement.releasePointerCapture( event.pointerId );

	if ( event.button === 2 && this.domElement.ownerDocument.pointerLockElement === this.domElement ) {

		this.domElement.ownerDocument.exitPointerLock();

	}

}

function onWheel( event ) {

	if ( this.enabled === false ) return;

	event.preventDefault();

	// browsers do not say what a wheel event came from: a pinch arrives with Ctrl held, a trackpad in small pixel
	// steps, often sideways, a mouse wheel in large upright steps or whole lines

	// a wheel turned while the right or middle button is held is always a mouse's: a trackpad has neither to hold. A
	// mouse that scrolls smoothly sends small steps that would otherwise pass for a trackpad's and turn the camera.

	const pinch = event.ctrlKey;
	const held = ( this._buttons & ( 2 | 4 ) ) !== 0;
	this.isTrackpad = ! held && ( pinch || ( event.deltaMode === 0 && ( event.deltaX !== 0 || Number.isInteger( event.deltaY ) === false || Math.abs( event.deltaY ) < 40 ) ) );

	if ( held ) {

		if ( event.deltaY !== 0 ) this._changeSpeed( event.deltaY );

	} else if ( pinch ) {

		this._pinch = - event.deltaY / 100 * this.pinchSpeed; // browsers scale a pinch by e^(-deltaY / 100)

	} else if ( this.isTrackpad ) {

		if ( ( this._buttons & 1 ) !== 0 ) {

			// pan, while the trackpad is pressed

			_euler.setFromQuaternion( this.object.quaternion, 'YXZ' );
			const yaw = _euler.y;
			const step = this.dragSpeed;
			this._move( Math.cos( yaw ) * event.deltaX * step, - event.deltaY * step, - Math.sin( yaw ) * event.deltaX * step );

		} else {

			this._rotate( this._curve( event.deltaX ) * this.gestureLookSpeed, this._curve( event.deltaY ) * this.gestureLookSpeed );

		}

	} else if ( this._buttons !== 0 ) {

		this._changeSpeed( event.deltaY );

	} else if ( event.deltaY !== 0 ) {

		this.object.getWorldDirection( _forward );
		const step = event.deltaY < 0 ? this.wheelStep : - this.wheelStep;
		this._move( _forward.x * step, _forward.y * step, _forward.z * step );

	}

	if ( this._moved ) this.dispatchEvent( _changeEvent );
	this._moved = false;

}

function onContextMenu( event ) {

	if ( this.enabled === false ) return;

	event.preventDefault();

}

export { UEControls };
