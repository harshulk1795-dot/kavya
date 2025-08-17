// modules/interactions.js
// Raycasting interactions: hover highlight and click to preview items.

export function createInteractionSystem(THREE, scene, camera, renderer, app) {
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	let hovered = null;

	// Create a few preview items on pedestals in each section
	const itemsGroup = new THREE.Group();
	itemsGroup.name = "Items";
	scene.add(itemsGroup);

	const itemData = [
		{ id: 'w_dress', name: "Silk Dress", price: 129, sectionX: -15, color: 0xff9dc9 },
		{ id: 'm_jacket', name: "Denim Jacket", price: 149, sectionX: 0, color: 0x9dccff },
		{ id: 'a_bag', name: "Leather Bag", price: 89, sectionX: 15, color: 0xa7f3c1 },
	];

	const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.8 });
	for (let i = 0; i < itemData.length; i++) {
		const d = itemData[i];
		const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 20), pedestalMat);
		pedestal.position.set(d.sectionX, 0.12, -5 + i * 1.2);
		pedestal.castShadow = true;
		pedestal.receiveShadow = true;
		itemsGroup.add(pedestal);

		const geom = new THREE.SphereGeometry(0.35, 28, 28);
		const mat = new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.2, roughness: 0.3 });
		const item = new THREE.Mesh(geom, mat);
		item.position.copy(pedestal.position).add(new THREE.Vector3(0, 0.55, 0));
		item.castShadow = true;
		item.userData.item = d;
		itemsGroup.add(item);
	}

	function setHover(object) {
		if (hovered === object) return;
		if (hovered && hovered.material) hovered.material.emissive = new THREE.Color(0x000000);
		hovered = object;
		if (hovered && hovered.material) hovered.material.emissive = new THREE.Color(0x222222);
	}

	function update(dt) {
		// Raycast from center of the screen for crosshair-like interaction
		mouse.set(0, 0);
		raycaster.setFromCamera(mouse, camera);
		const candidates = itemsGroup.children.filter(function(m){ return m.userData.item; });
		const intersects = raycaster.intersectObjects(candidates, false);
		if (intersects.length > 0) setHover(intersects[0].object); else setHover(null);
	}

	// Click to preview: update panels via app state
	renderer.domElement.addEventListener('click', function() {
		if (!hovered) return;
		app.state.selectedItem = hovered.userData.item;
		const panelsRoot = document.getElementById('panels-root');
		if (panelsRoot) panelsRoot.dispatchEvent(new CustomEvent('item-selected', { detail: app.state.selectedItem }));
	});

	// Simple texture inspect for hovered item on key press (I): toggles roughness
	document.addEventListener('keydown', function(e) {
		if (e.code === 'KeyI' && hovered && hovered.material) {
			hovered.material.roughness = hovered.material.roughness > 0.4 ? 0.2 : 0.8;
			hovered.material.needsUpdate = true;
		}
	});

	return {
		update,
		itemsGroup,
	};
}