// modules/panels.js
// Panels: details (selected item), cart, settings (graphics), and alerts.

export function createPanels(app, interactions, tryOn) {
	const root = document.getElementById('panels-root');
	if (!root) return {};

	// Details panel
	const details = document.createElement('div');
	details.className = 'panel';
	details.innerHTML = `
		<h3>Item Details</h3>
		<div id="details-content"><p>Look at an item and click to preview.</p></div>
	`;
	root.appendChild(details);

	// Cart panel
	const cart = document.createElement('div');
	cart.className = 'panel';
	cart.innerHTML = `
		<h3>Cart</h3>
		<div id="cart-content"><p>No items in cart.</p></div>
	`;
	root.appendChild(cart);

	// Settings panel
	const settings = document.createElement('div');
	settings.className = 'panel';
	settings.innerHTML = `
		<h3>Settings</h3>
		<div class="row">
			<label for="graphics-select">Graphics</label>
			<select id="graphics-select">
				<option value="low">Low</option>
				<option value="medium">Medium</option>
				<option value="high" selected>High</option>
			</select>
		</div>
	`;
	root.appendChild(settings);

	// Alert panel (ephemeral)
	const alert = document.createElement('div');
	alert.className = 'panel';
	alert.style.display = 'none';
	alert.innerHTML = `<h3 id="alert-title">Notice</h3><div id="alert-body"></div>`;
	root.appendChild(alert);

	// Update functions
	function renderCart() {
		const c = app.state.cart;
		const el = cart.querySelector('#cart-content');
		if (!c.length) { el.innerHTML = '<p>No items in cart.</p>'; return; }
		el.innerHTML = `
			<ul>
			${c.map(it => `<li>${it.name} - $${it.price}</li>`).join('')}
			</ul>
			<div class="row"><strong>Total</strong><span>$${c.reduce((a, b) => a + b.price, 0)}</span></div>
		`;
	}

	function renderDetails(item) {
		const el = details.querySelector('#details-content');
		if (!item) { el.innerHTML = '<p>Look at an item and click to preview.</p>'; return; }
		el.innerHTML = `
			<p><strong>${item.name}</strong></p>
			<p>Price: $${item.price}</p>
			<div class="row">
				<label for="size-select">Size</label>
				<select id="size-select">
					<option>S</option><option>M</option><option>L</option><option>XL</option>
				</select>
			</div>
			<div class="row">
				<button id="add-cart" class="btn primary">Add to Cart</button>
				<button id="add-wishlist" class="btn">Wishlist</button>
				<button id="apply" class="btn">Try On</button>
			</div>
		`;

		el.querySelector('#add-cart').addEventListener('click', () => { app.state.cart.push(item); renderCart(); });
		el.querySelector('#add-wishlist').addEventListener('click', () => { app.state.wishlist.push(item); });
		el.querySelector('#apply').addEventListener('click', () => {
			root.dispatchEvent(new CustomEvent('item-applied', { detail: item }));
		});
	}

	// Event wiring
	root.addEventListener('item-selected', (e) => renderDetails(e.detail));
	root.addEventListener('item-applied', (e) => tryOn.applySelectedItem(e.detail));
	root.addEventListener('cart-toggle', () => { cart.style.display = cart.style.display === 'none' ? '' : 'none'; });
	root.addEventListener('settings-open', () => { settings.style.display = ''; });
	root.addEventListener('alert-open', (e) => { alert.style.display = ''; alert.querySelector('#alert-title').textContent = e.detail.title; alert.querySelector('#alert-body').innerHTML = e.detail.html; });

	settings.querySelector('#graphics-select').addEventListener('change', (e) => {
		app.state.graphics = e.target.value;
		const setGraphics = window.__STORE__?.StoreApp?.setGraphics || null;
		// Forward to optimization via custom event to main
		document.dispatchEvent(new CustomEvent('graphics-change', { detail: app.state.graphics }));
	});

	// Initial state
	renderCart();

	return {
		renderCart,
		renderDetails,
	};
}