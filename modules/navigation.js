// modules/navigation.js
// Pointer-lock navigation with WASD movement and teleport hotspots.

export function createNavigator(THREE, scene, camera, renderer, app, options = {}) {
	const settings = { height: 1.7, speed: 2.5, mouseSensitivity: 0.002, ...options };

	const state = {
		enabled: false,
		velocity: new THREE.Vector3(),
		direction: new THREE.Vector3(),
		moveForward: false,
		moveBackward: false,
		moveLeft: false,
		moveRight: false,
		isLocked: false,
		lastStepTime: 0,
	};

	// Create yaw/pitch controls for camera
	const yaw = new THREE.Object3D();
	const pitch = new THREE.Object3D();
	yaw.position.set(0, settings.height, 0);
	pitch.add(camera);
	yaw.add(pitch);
	scene.add(yaw);

	function onMouseMove(e) {
		if (!state.isLocked) return;
		pitch.rotation.x -= e.movementY * settings.mouseSensitivity;
		yaw.rotation.y -= e.movementX * settings.mouseSensitivity;
		const lim = Math.PI / 2 - 0.05;
		if (pitch.rotation.x < -lim) pitch.rotation.x = -lim;
		if (pitch.rotation.x > lim) pitch.rotation.x = lim;
	}

	function onKeyDown(e) {
		switch (e.code) {
			case 'KeyW': state.moveForward = true; break;
			case 'KeyS': state.moveBackward = true; break;
			case 'KeyA': state.moveLeft = true; break;
			case 'KeyD': state.moveRight = true; break;
		}
	}
	function onKeyUp(e) {
		switch (e.code) {
			case 'KeyW': state.moveForward = false; break;
			case 'KeyS': state.moveBackward = false; break;
			case 'KeyA': state.moveLeft = false; break;
			case 'KeyD': state.moveRight = false; break;
		}
	}

	function requestPointerLock() {
		const el = renderer.domElement;
		if (el && el.requestPointerLock) el.requestPointerLock();
	}

	function onPointerLockChange() {
		state.isLocked = document.pointerLockElement === renderer.domElement;
	}

	function onCanvasFirstClick() {
		if (!state.isLocked) requestPointerLock();
	}

	function onClick(e) {
		// Teleport if clicking on a hotspot
		const mouse = new THREE.Vector2();
		const rect = renderer.domElement.getBoundingClientRect();
		mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, camera);
		const env = scene.userData.environment;
		if (!env) return;
		const intersects = raycaster.intersectObjects(env.hotspots, false);
		if (intersects.length > 0) {
			const hit = intersects[0].object;
			const target = hit.position.clone();
			target.y = 0;
			yaw.position.copy(target);
			pitch.rotation.set(0, 0, 0);
		}
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('keyup', onKeyUp);
	document.addEventListener('pointerlockchange', onPointerLockChange);
	renderer.domElement.addEventListener('click', onClick);
	renderer.domElement.addEventListener('click', onCanvasFirstClick, { once: true });

	function update(dt) {
		const speed = settings.speed;
		state.direction.set(0, 0, 0);
		if (state.moveForward) state.direction.z -= 1;
		if (state.moveBackward) state.direction.z += 1;
		if (state.moveLeft) state.direction.x -= 1;
		if (state.moveRight) state.direction.x += 1;
		state.direction.normalize();

		// Translate in local space of yaw (player heading)
		const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw.quaternion);
		const move = new THREE.Vector3();
		move.addScaledVector(forward, state.direction.z * speed * dt);
		move.addScaledVector(right, state.direction.x * speed * dt);
		yaw.position.add(move);

		// Footstep sound
		const mag = move.length();
		const now = performance.now();
		if (mag > 0.001 && now - state.lastStepTime > 380) {
			state.lastStepTime = now;
			try { if (app.footstepSound && app.footstepSound.isPlaying === false) app.footstepSound.play(); } catch (e) {}
		}

		// Keep camera attached
		camera.position.set(0, 0, 0);
	}

	return {
		requestPointerLock,
		update,
		yaw, // player root
		pitch,
	};
}