import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { UEControls } from '../src/UEControls.js';

// A city at real scale: blocks of 80 metres, streets of 20, buildings from a house to a tower.

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.fog = new THREE.Fog( 0xc9d3d8, 800, 4000 );

const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10000 );
camera.position.set( 0, 160, 900 );
camera.lookAt( 0, 0, 0 );

const sun = new THREE.Vector3().setFromSphericalCoords( 1, THREE.MathUtils.degToRad( 45 ), THREE.MathUtils.degToRad( 35 ) );

const sky = new Sky();
sky.scale.setScalar( 9000 );
sky.material.uniforms.sunPosition.value.copy( sun );
scene.add( sky );

scene.add( new THREE.HemisphereLight( 0xdde8ff, 0x8a8678, 2.5 ) );

const light = new THREE.DirectionalLight( 0xffffff, 3 );
light.position.copy( sun ).multiplyScalar( 600 );
light.castShadow = true;
light.shadow.normalBias = 0.5;
light.shadow.mapSize.set( 4096, 4096 );
Object.assign( light.shadow.camera, { left: - 600, right: 600, top: 600, bottom: - 600, far: 2000 } );
scene.add( light );

const ground = new THREE.Mesh( new THREE.PlaneGeometry( 8000, 8000 ), new THREE.MeshStandardMaterial( { color: 0xbab8b0 } ) );
ground.rotation.x = - Math.PI / 2;
ground.receiveShadow = true;
scene.add( ground );

const grid = new THREE.GridHelper( 2000, 20, 0x8a8a84, 0xa8a8a2 );
grid.position.y = 0.05;
scene.add( grid );

const BLOCK = 80, STREET = 20, BLOCKS = 12;
const random = mulberry32( 7 );
const geometry = new THREE.BoxGeometry( 1, 1, 1 ).translate( 0, 0.5, 0 );
const material = new THREE.MeshStandardMaterial( { color: 0xece8e0 } );
const buildings = new THREE.InstancedMesh( geometry, material, BLOCKS * BLOCKS * 9 );
buildings.castShadow = buildings.receiveShadow = true;

const matrix = new THREE.Matrix4();
let count = 0;

for ( let i = 0; i < BLOCKS; i ++ ) {

	for ( let j = 0; j < BLOCKS; j ++ ) {

		const x0 = ( i - BLOCKS / 2 ) * ( BLOCK + STREET ), z0 = ( j - BLOCKS / 2 ) * ( BLOCK + STREET );

		for ( let k = 0; k < 9; k ++ ) {

			const w = 18 + random() * 6, d = 18 + random() * 6;
			const tall = random() < 0.03 ? 60 + random() * 100 : 6 + random() * 18;
			matrix.makeScale( w, tall, d ).setPosition( x0 + ( k % 3 ) * 27 + 13, 0, z0 + Math.floor( k / 3 ) * 27 + 13 );
			buildings.setMatrixAt( count ++, matrix );

		}

	}

}

scene.add( buildings );

//

const controls = new UEControls( camera, renderer.domElement );

const timer = new THREE.Timer();
const readout = document.getElementById( 'readout' );

window.addEventListener( 'resize', onWindowResize );

renderer.setAnimationLoop( animate );

function animate( time ) {

	timer.update( time );
	controls.update( timer.getDelta() );
	renderer.render( scene, camera );

	readout.textContent = [
		`speed     ${ controls.speed.toFixed( 2 ) }`,
		`velocity  ${ controls.velocity.length().toFixed( 1 ) } m/s`,
		`position  ${ camera.position.toArray().map( ( v ) => v.toFixed( 1 ) ).join( ', ' ) }`,
		`fov       ${ camera.fov.toFixed( 1 ) }`,
		`input     ${ controls.isTrackpad ? 'trackpad' : 'mouse' }`,
	].join( '\n' );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function mulberry32( seed ) {

	return function () {

		seed |= 0; seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul( seed ^ seed >>> 15, 1 | seed );
		t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t;
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;

	};

}
