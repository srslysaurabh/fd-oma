// Menu Categories Data
const menuCategories = {
    'Quick Bites': [
        { name: 'Veg Spring Rolls', price: 95 },
        { name: 'Cheese Garlic Bread', price: 105 },
        { name: 'Korean Veg Baos', price: 95 },
    ],
    'Pizzas': [
        { name: 'Queen Margherita', price: 259 },
        { name: 'Corn and Cheese', price: 279 },
        { name: 'Veg Xtravaganza', price: 289 },
        { name: 'Paneer & Jalapeno', price: 299 },
        { name: 'Paneer Delight', price: 309 },
        { name: 'Basil Pesto Farmhouse', price: 319 },
        { name: 'Basil Pesto Paneer', price: 339 },
    ],
    'Coffee & Tea': [
        { name: 'Capuccino', price: 35 },
        { name: 'Latte', price: 35 },
        { name: 'Americano', price: 35 },
        { name: 'Flavoured Coffee - Hazelnut', price: 65 },
        { name: 'Flavoured Coffee - Mocha', price: 65 },
        { name: 'Flavoured Coffee - Irish Creme', price: 65 },
        { name: 'Masala Tea', price: 25 },
    ],
    'Hot Beverages': [
        { name: 'Hot Chocolate', price: 95 },
        { name: 'Badaam Milk', price: 95 },
        { name: 'Ragi Milk', price: 95 },
    ],
    'Cold Beverages': [
        { name: 'Ice Tea', price: 65 },
        { name: 'Cold Coffee', price: 75 },
        { name: 'Ice Americano', price: 70 },
    ],
    'Desserts': [
        { name: 'Brownie', price: 105 },
        { name: 'Chocolava', price: 119 },
        { name: 'Cake Slice', price: 65 },
        { name: 'Croissant', price: 75 },
    ],
};

// Application State
class POSState {
    constructor() {
        this.currentOrderId = 1;
        this.activeCategory = 'Quick Bites';
        this.cart = {};
        this.pendingOrders = [];
        this.completedOrders = [];
        this.dailyTotal = 0;
    }

    addToCart(item, quantity) {
        if (!this.cart[item.name]) {
            this.cart[item.name] = { ...item, quantity: 0 };
        }
        this.cart[item.name].quantity = Math.max(0, this.cart[item.name].quantity + quantity);
        if (this.cart[item.name].quantity === 0) {
            delete this.cart[item.name];
        }
    }

    createOrder() {
        const order = {
            id: this.currentOrderId++,
            items: Object.entries(this.cart).map(([name, item]) => ({
                name,
                quantity: item.quantity,
                price: item.price,
                served: 0
            })),
            total: this.calculateTotal(this.cart),
            timestamp: new Date(),
            isPaid: false,
            isCompleted: false
        };
        this.pendingOrders.push(order);
        this.cart = {};
        return order;
    }

    calculateTotal(items) {
        return Object.values(items).reduce((sum, item) => sum + (item.quantity * item.price), 0);
    }

    serveItem(orderId, itemName) {
        const order = this.pendingOrders.find(o => o.id === orderId);
        if (!order) return false;

        const item = order.items.find(i => i.name === itemName);
        if (!item || item.served >= item.quantity) return false;

        item.served++;
        this.checkOrderCompletion(order);
        return true;
    }

    markAsPaid(orderId) {
        const order = this.pendingOrders.find(o => o.id === orderId);
        if (!order) return false;

        order.isPaid = true;
        this.checkOrderCompletion(order);
        return true;
    }

    checkOrderCompletion(order) {
        const allServed = order.items.every(item => item.served === item.quantity);
        if (allServed && order.isPaid && !order.isCompleted) {
            order.isCompleted = true;
            this.completeOrder(order);
        }
    }

    completeOrder(order) {
        this.pendingOrders = this.pendingOrders.filter(o => o.id !== order.id);
        this.completedOrders.push({
            ...order,
            completedAt: new Date()
        });
        this.dailyTotal += order.total;
    }

    saveState() {
        localStorage.setItem('posState', JSON.stringify({
            currentOrderId: this.currentOrderId,
            pendingOrders: this.pendingOrders,
            completedOrders: this.completedOrders,
            dailyTotal: this.dailyTotal
        }));
    }

    loadState() {
        const saved = localStorage.getItem('posState');
        if (saved) {
            const state = JSON.parse(saved);
            this.currentOrderId = state.currentOrderId;
            this.pendingOrders = state.pendingOrders;
            this.completedOrders = state.completedOrders;
            this.dailyTotal = state.dailyTotal;
        }
    }
}

// UI Controller
class POSUI {
    constructor(state) {
        this.state = state;
        this.bindEvents();
        this.updateUI();
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
    }

    updateUI() {
        this.updateCart();
        this.updateMenuItems();
        this.updateOrders();
    }

    updateCart() {
        const cartContainer = document.getElementById('current-cart');
        cartContainer.innerHTML = Object.entries(this.state.cart)
            .map(([name, item]) => `
                <div class="cart-item">
                    <span>${name} x${item.quantity}</span>
                    <span>₹${item.price * item.quantity}</span>
                </div>
            `).join('');

        const total = this.state.calculateTotal(this.state.cart);
        document.getElementById('cart-total').textContent = total;
        document.getElementById('place-order-btn').disabled = total === 0;
    }

    updateMenuItems() {
        const container = document.getElementById('menu-items');
        container.innerHTML = menuCategories[this.state.activeCategory]
            .map(item => `
                <div class="menu-item">
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>₹${item.price}</p>
                    </div>
                    <div class="quantity-controls">
                        <button class="qty-btn minus" onclick="ui.updateQuantity(${JSON.stringify(item)}, -1)">-</button>
                        <span>${this.state.cart[item.name]?.quantity || 0}</span>
                        <button class="qty-btn plus" onclick="ui.updateQuantity(${JSON.stringify(item)}, 1)">+</button>
                    </div>
                </div>
            `).join('');
    }

    updateOrders() {
        // Update pending orders
        const pendingContainer = document.getElementById('pending-orders');
        pendingContainer.innerHTML = this.state.pendingOrders.length ? 
            this.state.pendingOrders.map(order => `
                <div class="pending-order">
                    <div class="order-header">
                        <span class="font-medium">Order #${order.id}</span>
                        <div class="order-actions">
                            ${!order.isPaid ? `
                                <button class="action-btn payment-btn" onclick="ui.handlePayment(${order.id})">
                                    <i data-lucide="dollar-sign"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                        ${order.items.map(item => `
                            <div class="order-item-status ${item.served === item.quantity ? 'completed' : ''}">
                                <div>
                                    ${item.name} x${item.quantity}
                                    ${item.served > 0 ? ` (${item.served}/${item.quantity} served)` : ''}
                                </div>
                                ${item.served < item.quantity ? `
                                    <button 
                                        class="complete-item-btn"
                                        onclick="ui.serveItem(${order.id}, '${item.name}')"
                                    >
                                        Serve
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                        <div class="mt-1">Total: ₹${order.total}</div>
                        <div class="text-xs mt-1">
                            ${order.isPaid ? 
                                '<span class="status-paid">Payment Received</span>' : 
                                '<span class="status-pending">Payment Pending</span>'
                            }
                        </div>
                    </div>
                </div>
            `).join('') : 
            '<div class="text-gray-500 text-center">No pending orders</div>';

        // Update completed orders
        const completedContainer = document.getElementById('completed-orders');
        completedContainer.innerHTML = this.state.completedOrders.length ?
            this.state.completedOrders.map(order => `
                <div class="completed-order">
                    <div class="font-medium">Order #${order.id} - ₹${order.total}</div>
                    <div class="text-sm text-gray-600 mt-1">
                        ${order.items.map(item => `
                            <div>${item.name} x${item.quantity}</div>
                        `).join('')}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${new Date(order.completedAt).toLocaleTimeString()}
                    </div>
                </div>
            `).join('') :
            '<div class="completed-order">No completed orders</div>';

        // Update daily total
        document.getElementById('daily-total').textContent = this.state.dailyTotal;

        // Refresh icons
        lucide.createIcons();
    }

    // Event Handlers
    updateQuantity(item, change) {
        this.state.addToCart(item, change);
        this.updateUI();
    }

    changeCategory(category) {
        this.state.activeCategory = category;
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent === category);
        });
        this.updateMenuItems();
    }

    showConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        const details = document.getElementById('confirm-order-details');
        
        details.innerHTML = `
            ${Object.entries(this.state.cart).map(([name, item]) => `
                <div class="cart-item">
                    <span>${name} x${item.quantity}</span>
                    <span>₹${item.price * item.quantity}</span>
                </div>
            `).join('')}
            <div class="cart-total">
                <span>Total</span>
                <span>₹${this.state.calculateTotal(this.state.cart)}</span>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    hideConfirmModal() {
        document.getElementById('confirm-modal').style.display = 'none';
    }

    showPaymentModal(orderId) {
        const order = this.state.pendingOrders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('payment-modal');
        document.getElementById('payment-amount').textContent = order.total;
        modal.dataset.orderId = orderId;
        modal.style.display = 'flex';
    }

    hidePaymentModal() {
        const modal = document.getElementById('payment-modal');
        modal.dataset.orderId = '';
        modal.style.display = 'none';
    }

    placeOrder() {
        if (Object.keys(this.state.cart).length === 0) return;
        this.showConfirmModal();
    }

    confirmOrder() {
        const order = this.state.createOrder();
        this.hideConfirmModal();
        this.showPaymentModal(order.id);
        this.updateUI();
        this.state.saveState();
    }

    handlePayment(orderId) {
        if (this.state.markAsPaid(orderId)) {
            this.hidePaymentModal();
            this.showNotification('Payment received successfully!');
            this.updateUI();
            this.state.saveState();
        }
    }

    serveItem(orderId, itemName) {
        if (this.state.serveItem(orderId, itemName)) {
            this.updateUI();
            this.state.saveState();
        }
    }

    bindEvents() {
        // Initial setup
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-IN', options);

        // Create category tabs
        const tabsContainer = document.getElementById('category-tabs');
        tabsContainer.innerHTML = Object.keys(menuCategories)
            .map(category => `
                <button class="tab ${category === this.state.activeCategory ? 'active' : ''}"
                        onclick="ui.changeCategory('${category}')">${category}</button>
            `).join('');

        // Bind button events
        document.getElementById('place-order-btn').addEventListener('click', () => this.placeOrder());
        document.getElementById('cancel-order').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirm-order').addEventListener('click', () => this.confirmOrder());
        document.getElementById('payment-received').addEventListener('click', () => {
            const orderId = parseInt(document.getElementById('payment-modal').dataset.orderId);
            if (orderId) this.handlePayment(orderId);
        });
        document.getElementById('payment-pending').addEventListener('click', () => this.hidePaymentModal());
    }
}

// Initialize application
const pos = new POSState();
const ui = new POSUI(pos);

// Load saved state
pos.loadState();
