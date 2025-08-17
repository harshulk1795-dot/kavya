// modules/tryon.js
// Virtual try-on placeholder: loads an abstract avatar and applies selected garments as color/material overlays.

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
	[back, left, right].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });

	// Floor
	const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.8 }));
	floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);

	// Mirror
	const mirrorPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ color: 0x222, metalness: 0.8, roughness: 0.2 }));
	mirrorPlane.position.set(0, 1.6, -2.49); group.add(mirrorPlane);

	// Lighting
	const key = new THREE.SpotLight(0xffffff, 1.0, 12, Math.PI / 7, 0.3, 0.8);
	key.position.set(1.5, 3.2, 1.5); key.target.position.set(0, 1.6, 0); key.castShadow = true; group.add(key); group.add(key.target);
	const fill = new THREE.RectAreaLight(0x74c0fc, 10.0, 2, 3); fill.position.set(-1.6, 2.0, 1.2); fill.lookAt(-1.6, 1.2, 0); group.add(fill);

	// Avatar placeholder (capsule + spheres)
	const skin = new THREE.MeshStandardMaterial({ color: 0xffe1c4, roughness: 0.6, metalness: 0.0 });
	const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.1, 8, 16), skin); body.position.set(0, 1.4, 0); body.castShadow = true; group.add(body);
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), skin); head.position.set(0, 2.1, 0); head.castShadow = true; group.add(head);

	// Garment overlay (changes material on selection)
	const garmentMat = new THREE.MeshStandardMaterial({ color: 0x8888ff, metalness: 0.2, roughness: 0.4 });
	const garment = new THREE.Mesh(new THREE.CapsuleGeometry(0.37, 0.6, 8, 16), garmentMat); garment.position.set(0, 1.4, 0); garment.castShadow = true; group.add(garment);

	function applySelectedItem(item) {
		if (!item) return;
		// Map item id to stylistic colors as a placeholder
		const colorMap = {
			w_dress: 0xff6b9a,
			m_jacket: 0x74c0fc,
			a_bag: 0x69db7c,
		};
		garmentMat.color.setHex(colorMap[item.id] || 0xffffff);
		garmentMat.metalness = item.id === 'a_bag' ? 0.6 : 0.2;
		garmentMat.roughness = item.id === 'w_dress' ? 0.3 : 0.5;
		garmentMat.needsUpdate = true;
	}

	// Panels notify via custom event
	document.getElementById('panels-root')?.addEventListener('item-applied', (e) => {
		applySelectedItem(e.detail);
	});

	function update(dt) {
		// idle bob for life
		const t = performance.now() * 0.001;
		head.position.y = 2.1 + Math.sin(t * 1.5) * 0.01;
		garment.rotation.y = Math.sin(t * 0.5) * 0.2;
	}

	return {
		update,
		applySelectedItem,
		group,
	};
}