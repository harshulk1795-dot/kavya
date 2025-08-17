// modules/tryon.js
// Virtual try-on: loads a simple avatar model (local GLTF) with graceful fallback, applies selected garments,
// and features a reflective mirror inside a small trial room.

import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

export function createTryOnSystem(THREE, scene, camera, renderer, app) {
	const group = new THREE.Group();
	group.name = "TryOnRoom";
	group.position.set(0, 0, 10);
	scene.add(group);

	// Trial room walls
	const roomMat = new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.9 });
	const back = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.1), roomMat); back.position.set(0, 1.5, -2.5);
	const left = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 5), roomMat); left.position.set(-3, 1.5, 0);
	const right = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 5), roomMat); right.position.set(3, 1.5, 0);
	[back, left, right].forEach(function(m){ m.castShadow = true; m.receiveShadow = true; group.add(m); });

	// Floor
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.8 }));
	floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);

	// Reflective mirror (render target)
	const mirror = createMirror(THREE, renderer, { width: 2.2, height: 2.8 });
	mirror.position.set(0, 1.6, -2.49);
	group.add(mirror);

	// Lighting
	const key = new THREE.SpotLight(0xffffff, 1.0, 12, Math.PI / 7, 0.3, 0.8);
	key.position.set(1.5, 3.2, 1.5); key.target.position.set(0, 1.6, 0); key.castShadow = true; group.add(key); group.add(key.target);
	const fill = new THREE.RectAreaLight(0x74c0fc, 8.0, 2, 3); fill.position.set(-1.6, 2.0, 1.2); fill.lookAt(-1.6, 1.2, 0); group.add(fill);

	// Avatar placeholder (capsule + sphere), hidden if GLTF loads
	const placeholder = new THREE.Group();
	const skin = new THREE.MeshStandardMaterial({ color: 0xffe1c4, roughness: 0.6, metalness: 0.0 });
	const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.1, 8, 16), skin); body.position.set(0, 1.4, 0); body.castShadow = true; placeholder.add(body);
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), skin); head.position.set(0, 2.1, 0); head.castShadow = true; placeholder.add(head);
	group.add(placeholder);

	// Garment overlay (changes material on selection)
	const garmentMat = new THREE.MeshStandardMaterial({ color: 0x8888ff, metalness: 0.2, roughness: 0.4 });
	const garment = new THREE.Mesh(new THREE.CapsuleGeometry(0.37, 0.6, 8, 16), garmentMat); garment.position.set(0, 1.4, 0); garment.castShadow = true; group.add(garment);

	// Try to load a tiny local GLTF avatar
	const loader = new GLTFLoader();
	loader.load("./assets/models/avatar.gltf", function(gltf) {
		var model = gltf.scene ? gltf.scene : (gltf.scenes && gltf.scenes[0] ? gltf.scenes[0] : null);
		if (model) {
			model.traverse(function(n){ if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
			model.scale.set(1.2, 1.2, 1.2);
			model.position.set(0, 0, 0);
			placeholder.visible = false;
			group.add(model);
		}
	}, undefined, function(err) {
		// Fallback silently to placeholder
		try { console.warn("Avatar GLTF failed to load, using placeholder.", err); } catch (e) {}
	});

	function applySelectedItem(item) {
		if (!item) return;
		// Map item id to stylistic colors as a placeholder
		var colorMap = {
			w_dress: 0xff6b9a,
			m_jacket: 0x74c0fc,
			a_bag: 0x69db7c
		};
		garmentMat.color.setHex(colorMap[item.id] || 0xffffff);
		garmentMat.metalness = item.id === 'a_bag' ? 0.6 : 0.2;
		garmentMat.roughness = item.id === 'w_dress' ? 0.3 : 0.5;
		garmentMat.needsUpdate = true;
	}

	// Panels notify via custom event
	var panelsRoot = document.getElementById('panels-root');
	if (panelsRoot) {
		panelsRoot.addEventListener('item-applied', function(e){
			applySelectedItem(e.detail);
			try { if (window.__STORE__ && window.__STORE__.StoreApp && window.__STORE__.StoreApp.rustleSound) window.__STORE__.StoreApp.rustleSound.play(); } catch (err) {}
		});
	}

	function update(dt) {
		// idle motion for life
		const t = performance.now() * 0.001;
		garment.rotation.y = Math.sin(t * 0.5) * 0.2;
	}

	return {
		update: update,
		applySelectedItem: applySelectedItem,
		group: group
	};
}

// Simple planar mirror with render target for the try-on room
function createMirror(THREE, renderer, options) {
	options = options || {};
	const width = options.width || 2;
	const height = options.height || 2;
	const mirrorGroup = new THREE.Group();
	const planeGeo = new THREE.PlaneGeometry(width, height);
	const renderTarget = new THREE.WebGLRenderTarget(512, 512, { generateMipmaps: true });
	const mirrorMat = new THREE.MeshBasicMaterial({ map: renderTarget.texture });
	const mirrorMesh = new THREE.Mesh(planeGeo, mirrorMat);
	mirrorMesh.name = "TryOnMirrorSurface";
	mirrorMesh.castShadow = false;
	mirrorMesh.receiveShadow = false;
	mirrorGroup.add(mirrorMesh);

	mirrorGroup.onBeforeRender = function(rendererIn, scene, camera) {
		const oldTarget = renderer.getRenderTarget();
		const mirrorCam = camera.clone();
		mirrorCam.position.set(0, camera.position.y, camera.position.z + 0.001);
		mirrorCam.lookAt(0, camera.position.y, camera.position.z - 1);
		renderer.setRenderTarget(renderTarget);
		renderer.render(scene, mirrorCam);
		renderer.setRenderTarget(oldTarget);
	};

	return mirrorGroup;
}