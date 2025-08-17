// modules/optimization.js
// Basic optimization helpers: LOD grouping, texture streaming placeholders, graphics toggle.

export function createOptimization(THREE, renderer, scene) {
	let quality = 'high';

	function setGraphics(q) {
		quality = q;
		if (q === 'low') {
			renderer.setPixelRatio(1.0);
			renderer.shadowMap.enabled = false;
			applyMaterialQuality(scene, 0.9);
		} else if (q === 'medium') {
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFShadowMap;
			applyMaterialQuality(scene, 0.6);
		} else {
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			applyMaterialQuality(scene, 0.3);
		}
	}

	function applyMaterialQuality(root, roughness) {
		root.traverse((obj) => {
			if (obj.isMesh && obj.material && obj.material.roughness !== undefined) {
				obj.material.roughness = Math.min(1.0, Math.max(0.15, roughness));
				obj.material.needsUpdate = true;
			}
		});
	}

	// Simple LOD creation for a mesh (not used heavily here but provided)
	function createLOD(high, medium, low, distances = [0, 15, 35]) {
		const lod = new THREE.LOD();
		lod.addLevel(high, distances[0]);
		lod.addLevel(medium || high.clone(), distances[1]);
		lod.addLevel(low || medium?.clone() || high.clone(), distances[2]);
		return lod;
	}

	// Texture streaming placeholder
	function streamTexture(url, material, onLoaded) {
		const loader = new THREE.TextureLoader();
		const tiny = document.createElement('canvas');
		tiny.width = tiny.height = 2;
		const tinyTex = new THREE.CanvasTexture(tiny);
		material.map = tinyTex; material.needsUpdate = true;
		loader.load(url, (tex) => {
			tex.colorSpace = THREE.SRGBColorSpace;
			tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
			material.map = tex; material.needsUpdate = true;
			onLoaded && onLoaded(tex);
		});
	}

	// Listen to graphics change event
	document.addEventListener('graphics-change', (e) => setGraphics(e.detail));

	return { setGraphics, createLOD, streamTexture };
}