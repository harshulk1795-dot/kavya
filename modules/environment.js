// modules/environment.js
// Builds the boutique environment: floors, walls, sections, lighting, mirrors, mannequins, plants, and seating.
// Uses simple Three primitives so the project runs without external model dependencies.

export function buildEnvironment(THREE, scene, loadingManager) {
	const group = new THREE.Group();
	group.name = "Environment";
	scene.add(group);

	// Floor
	const floorSize = 60;
	const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 1, 1);
	const floorTex = new THREE.Texture(generateCheckerTexture());
	floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
	floorTex.repeat.set(20, 20);
	floorTex.colorSpace = THREE.SRGBColorSpace;
	floorTex.needsUpdate = true;
	const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, metalness: 0.05, roughness: 0.9 });
	const floor = new THREE.Mesh(floorGeo, floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.receiveShadow = true;
	floor.name = "Floor";
	group.add(floor);

	// Perimeter walls
	const wallHeight = 4;
	const wallThickness = 0.2;
	const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1e2b, roughness: 0.9, metalness: 0.0 });
	const buildWall = (w, h, d) => {
		const geo = new THREE.BoxGeometry(w, h, d);
		const mesh = new THREE.Mesh(geo, wallMat);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	};
	const half = floorSize / 2;
	const walls = [
		Object.assign(buildWall(floorSize, wallHeight, wallThickness), { position: new THREE.Vector3(0, wallHeight / 2, -half) }),
		Object.assign(buildWall(floorSize, wallHeight, wallThickness), { position: new THREE.Vector3(0, wallHeight / 2, half) }),
		Object.assign(buildWall(wallThickness, wallHeight, floorSize), { position: new THREE.Vector3(-half, wallHeight / 2, 0) }),
		Object.assign(buildWall(wallThickness, wallHeight, floorSize), { position: new THREE.Vector3(half, wallHeight / 2, 0) }),
	];
	walls.forEach(w => group.add(w));

	// Section dividers and labels: Women's, Men's, Accessories
	const fontColor = 0xeef2f7;
	const sectionData = [
		{ name: "Women’s", x: -15, z: 0, color: 0xff6b9a },
		{ name: "Men’s", x: 0, z: 0, color: 0x74c0fc },
		{ name: "Accessories", x: 15, z: 0, color: 0x69db7c },
	];
	const dividerMat = new THREE.MeshStandardMaterial({ color: 0x11131a, metalness: 0.1, roughness: 0.6 });
	for (const s of sectionData) {
		const divider = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 18), dividerMat);
		divider.position.set(s.x, 1.25, 0);
		divider.castShadow = true;
		divider.receiveShadow = true;
		divider.userData.section = s.name;
		group.add(divider);

		// Neon-ish label plane
		const labelCanvas = makeTextLabelCanvas(s.name, s.color);
		const labelTex = new THREE.CanvasTexture(labelCanvas);
		labelTex.colorSpace = THREE.SRGBColorSpace;
		const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
		const label = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), labelMat);
		label.position.set(s.x, 2.8, -9);
		group.add(label);
	}

	// Chandeliers: simple emissive spheres and metallic rings
	const chandelierGroup = new THREE.Group();
	for (let i = -1; i <= 1; i++) {
		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(1.2, 0.05, 16, 64),
			new THREE.MeshStandardMaterial({ color: 0xb197fc, metalness: 0.9, roughness: 0.2 })
		);
		ring.position.set(i * 12, 3.4, -4);
		ring.castShadow = true;
		chandelierGroup.add(ring);

		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.2, 20, 20),
			new THREE.MeshStandardMaterial({ emissive: 0xfff1b5, emissiveIntensity: 2.0, color: 0x222222 })
		);
		bulb.position.set(i * 12, 3.7, -4);
		bulb.castShadow = false;
		chandelierGroup.add(bulb);

		const spot = new THREE.SpotLight(0xfff1b5, 1.2, 25, Math.PI / 5, 0.35, 0.8);
		spot.position.set(i * 12, 3.8, -4);
		spot.target.position.set(i * 12, 0, -4);
		spot.castShadow = true;
		chandelierGroup.add(spot);
		chandelierGroup.add(spot.target);
	}
	group.add(chandelierGroup);

	// Mirrors with planar reflections
	const mirrors = new THREE.Group();
	for (const pos of [new THREE.Vector3(-15, 1.2, 8), new THREE.Vector3(15, 1.2, 8)]) {
		const mirror = createMirror(THREE, { width: 3, height: 2, position: pos });
		mirrors.add(mirror);
	}
	group.add(mirrors);

	// Plants and seating using primitives
	const decor = new THREE.Group();
	for (let i = 0; i < 6; i++) {
		const pot = new THREE.Mesh(
			new THREE.CylinderGeometry(0.25, 0.3, 0.4, 16),
			new THREE.MeshStandardMaterial({ color: 0x5c677d, roughness: 0.8 })
		);
		pot.position.set(-20 + i * 8, 0.2, -6 + (i % 2) * 12);
		pot.castShadow = true;
		pot.receiveShadow = true;
		decor.add(pot);

		const plant = new THREE.Mesh(
			new THREE.ConeGeometry(0.35, 1.2, 12),
			new THREE.MeshStandardMaterial({ color: 0x7cd992, roughness: 0.5 })
		);
		plant.position.copy(pot.position).add(new THREE.Vector3(0, 0.8, 0));
		plant.castShadow = true;
		decor.add(plant);
	}

	// Benches
	for (let i = -1; i <= 1; i++) {
		const bench = new THREE.Mesh(
			new THREE.BoxGeometry(2.8, 0.2, 0.6),
			new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.7 })
		);
		bench.position.set(i * 10, 0.2, 5);
		bench.castShadow = true;
		bench.receiveShadow = true;
		decor.add(bench);
	}
	group.add(decor);

	// Mannequins (placeholders as white glossy figures)
	const mannequins = new THREE.Group();
	for (const x of [-15, 0, 15]) {
		const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x3a3f4f }));
		base.position.set(x, 0.03, -2);
		base.receiveShadow = true;
		mannequins.add(base);

		const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.3 }));
		body.position.set(x, 1.2, -2);
		body.castShadow = true;
		mannequins.add(body);

		const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 20), new THREE.MeshStandardMaterial({ color: 0xfafafa, metalness: 0.1, roughness: 0.2 }));
		head.position.set(x, 2.0, -2);
		head.castShadow = true;
		mannequins.add(head);
	}
	group.add(mannequins);

	// Ambient and area lighting per section
	const hemi = new THREE.HemisphereLight(0xdbe9ff, 0x10121a, 0.35);
	group.add(hemi);

	const buildAreaLight = (color, x) => {
		const light = new THREE.RectAreaLight(color, 9.0, 6, 3);
		light.position.set(x, 2.5, -6);
		light.lookAt(x, 1.5, -6);
		return light;
	};
	group.add(buildAreaLight(0xff6b9a, -15)); // Women’s
	group.add(buildAreaLight(0x74c0fc, 0));   // Men’s
	group.add(buildAreaLight(0x69db7c, 15));  // Accessories

	// Teleport hotspots markers
	const hotspotGeo = new THREE.RingGeometry(0.3, 0.35, 32);
	const hotspotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
	const hotspotPositions = [
		{ name: "Women’s", position: new THREE.Vector3(-15, 0.01, 0) },
		{ name: "Men’s", position: new THREE.Vector3(0, 0.01, 0) },
		{ name: "Accessories", position: new THREE.Vector3(15, 0.01, 0) },
		{ name: "Entrance", position: new THREE.Vector3(0, 0.01, 12) },
	];
	const hotspots = [];
	for (const h of hotspotPositions) {
		const ring = new THREE.Mesh(hotspotGeo, hotspotMat.clone());
		ring.rotation.x = -Math.PI / 2;
		ring.position.copy(h.position);
		ring.userData.teleport = h.name;
		group.add(ring);
		hotspots.push(ring);
	}

	// Expose for other systems via scene.userData
	scene.userData.environment = {
		group,
		floor,
		walls,
		mirrors,
		mannequins,
		hotspots,
	};

	return scene.userData.environment;
}

// Utility: generate a checkerboard canvas texture
function generateCheckerTexture() {
	const size = 256;
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const ctx = c.getContext("2d");
	const s = 16;
	for (let y = 0; y < size; y += s) {
		for (let x = 0; x < size; x += s) {
			const even = ((x / s) + (y / s)) % 2 === 0;
			ctx.fillStyle = even ? "#1a1f2c" : "#141824";
			ctx.fillRect(x, y, s, s);
		}
	}
	return c;
}

// Utility: text label canvas
function makeTextLabelCanvas(text, color) {
	const padding = 20;
	const fontSize = 64;
	const font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	ctx.font = font;
	const metrics = ctx.measureText(text);
	const w = Math.ceil(metrics.width) + padding * 2;
	const h = fontSize + padding * 2;
	canvas.width = w;
	canvas.height = h;
	ctx.font = font;
	ctx.fillStyle = "rgba(0,0,0,0)";
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = "rgba(255,255,255,0.08)";
	roundedRect(ctx, 0, 0, w, h, 20, true, false);
	ctx.shadowColor = "rgba(255,255,255,0.6)";
	ctx.shadowBlur = 20;
	ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
	ctx.textBaseline = "middle";
	ctx.fillText(text, padding, h / 2);
	return canvas;
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
	if (typeof stroke === 'undefined') stroke = true;
	if (typeof radius === 'undefined') radius = 5;
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	if (fill) ctx.fill();
	if (stroke) ctx.stroke();
}

// Simple planar mirror with render target
function createMirror(THREE, { width = 2, height = 2, position = new THREE.Vector3() } = {}) {
	const mirrorGroup = new THREE.Group();
	mirrorGroup.position.copy(position);

	const planeGeo = new THREE.PlaneGeometry(width, height);
	const renderTarget = new THREE.WebGLRenderTarget(512, 512, { generateMipmaps: true });
	const mirrorMat = new THREE.MeshBasicMaterial({ map: renderTarget.texture });
	const mirrorMesh = new THREE.Mesh(planeGeo, mirrorMat);
	mirrorMesh.name = "MirrorSurface";
	mirrorMesh.castShadow = false;
	mirrorMesh.receiveShadow = false;
	mirrorMesh.rotation.y = Math.PI; // face towards room
	mirrorGroup.add(mirrorMesh);

	// Frame
	const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2f3d, metalness: 0.6, roughness: 0.25 }));
	frame.position.z = -0.03;
	mirrorGroup.add(frame);

	// Update function: renders scene from opposite direction into the texture.
	mirrorGroup.userData.render = (renderer, scene, camera) => {
		const oldTarget = renderer.getRenderTarget();
		const mirrorCam = camera.clone();
		mirrorCam.position.copy(mirrorGroup.position);
		mirrorCam.position.y = camera.position.y; // match viewer height
		mirrorCam.lookAt(camera.position.x, camera.position.y, camera.position.z);
		renderer.setRenderTarget(renderTarget);
		renderer.render(scene, mirrorCam);
		renderer.setRenderTarget(oldTarget);
	};

	// Hook into scene onBeforeRender to update
	mirrorGroup.onBeforeRender = (renderer, scene, camera) => {
		if (mirrorGroup.userData.render) mirrorGroup.userData.render(renderer, scene, camera);
	};

	return mirrorGroup;
}