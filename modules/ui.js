// modules/ui.js
// Floating icons and basic UI controls: home, cart, wishlist, settings, exit.

export function createUI(app, { ambientMusic, footstepSound, rustleSound, setGraphics }) {
	const root = document.getElementById('floating-icons');
	if (!root) return {};

	const icons = [
		{ id: 'home', title: 'Home', img: 'home' },
		{ id: 'cart', title: 'Cart', img: 'cart' },
		{ id: 'wishlist', title: 'Wishlist', img: 'heart' },
		{ id: 'settings', title: 'Settings', img: 'settings' },
		{ id: 'exit', title: 'Exit', img: 'exit' },
	];

	for (const icon of icons) {
		const btn = document.createElement('button');
		btn.className = 'icon-btn';
		btn.title = icon.title;
		btn.setAttribute('aria-label', icon.title);
		const img = document.createElement('img');
		img.alt = '';
		img.src = `./assets/icons/${icon.img}.svg`;
		btn.appendChild(img);
		root.appendChild(btn);

		btn.addEventListener('click', () => onIconClick(icon.id));
		btn.addEventListener('mouseenter', () => showTooltip(icon.title));
		btn.addEventListener('mouseleave', () => showTooltip(''));
	}

	function onIconClick(id) {
		switch (id) {
			case 'home': {
				showTooltip('Teleporting to entrance');
				const env = app.scene.userData.environment;
				if (env) {
					const entrance = env.hotspots.find(h => h.userData.teleport === 'Entrance');
					if (entrance && app.navigator && app.navigator.yaw) {
						app.navigator.yaw.position.copy(entrance.position);
						app.navigator.yaw.position.y = 0;
					}
				}
				break;
			}
			case 'cart': {
				toggleCartPanel();
				break;
			}
			case 'wishlist': {
				alertPanel('Wishlist', listToHtml(app.state.wishlist));
				break;
			}
			case 'settings': {
				openSettings();
				break;
			}
			case 'exit': {
				// Release pointer lock and pause music
				try { document.exitPointerLock(); } catch (e) {}
				try { ambientMusic && ambientMusic.isPlaying && ambientMusic.pause(); } catch (e) {}
				showTooltip('Pointer unlocked');
				break;
			}
		}
	}

	function listToHtml(list) {
		if (!list || list.length === 0) return '<p>Empty</p>';
		return `<ul>${list.map(it => `<li>${it.name} - $${it.price}</li>`).join('')}</ul>`;
	}

	function toggleCartPanel() {
		const panelsRoot = document.getElementById('panels-root');
		panelsRoot?.dispatchEvent(new CustomEvent('cart-toggle'));
	}

	function openSettings() {
		const panelsRoot = document.getElementById('panels-root');
		panelsRoot?.dispatchEvent(new CustomEvent('settings-open'));
	}

	function alertPanel(title, html) {
		const panelsRoot = document.getElementById('panels-root');
		panelsRoot?.dispatchEvent(new CustomEvent('alert-open', { detail: { title, html } }));
	}

	function showTooltip(text) {
		const t = document.getElementById('tooltip');
		if (!t) return;
		t.textContent = text;
		t.hidden = !text;
	}

	return {
		showTooltip,
	};
}