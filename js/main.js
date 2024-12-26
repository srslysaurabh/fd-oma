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

// State management
let currentOrderId = 1;
let activeCategory = 'Quick Bites';
let cart = {};
let orders = [];
let completedOrders = [];
let dailyTotal = 0;

// Utility Functions
function calculateTotal(items) {
    return Object.values(items).reduce((total, item) => {
        return total + (item.quantity * item.price);
    }, 0);
}

function updateQuantity(item, change) {
    if (!cart[item.name]) {
        cart[item.name] = { ...item, quantity: 0 };
    }
    cart[item.name].quantity = Math.max(0, cart[item.name].quantity + change);
    if (cart[item.name].quantity === 0) {
        delete cart[item.name];
    }
    updateUI();
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function updateUI() {
    // Update cart
    const cartContainer = document.getElementById('current-cart');
    cartContainer.innerHTML = Object.entries(cart)
        .map(([name, item]) => `
            <div class="cart-item">
                <span>${name} x${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `).join('');

    // Update total
    document.getElementById('cart-total').textContent = calculateTotal(cart);

    // Update place order button
    document.getElementById('place-order-btn').disabled = Object.keys(cart).length === 0;

    // Update menu items
    updateMenuItems();
}

function updateOrdersUI() {
    // Update pending orders
    const pendingOrdersContainer = document.getElementById('pending-orders');
    pendingOrdersContainer.innerHTML = orders.length ? orders.map(order => `
        <div class="pending-order">
            <div class="order-header">
                <span class="font-medium">Order #${order.id}</span>
                <div class="order-actions">
                    ${!order.paid ? `
                        <button class="action-btn payment-btn" onclick="handlePayment(${order.id})">
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
                                onclick="serveItem(${order.id}, '${item.name}')"
                            >
                                Serve
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
                <div class="mt-1">Total: ₹${order.total}</div>
                <div class="text-xs mt-1">
                    ${order.paid ? 
                        '<span class="status-paid">Payment Received</span>' : 
                        '<span class="status-pending">Payment Pending</span>'
                    }
                </div>
            </div>
        </div>
    `).join('') : '<div class="text-gray-500 text-center">No pending orders</div>';

    // Update completed orders
    const completedOrdersContainer = document.getElementById('completed-orders');
    completedOrdersContainer.innerHTML = completedOrders.length ? completedOrders.map(order => `
        <div class="completed-order">
            <div class="font-medium">Order #${order.id} - ₹${order.total}</div>
            <div class="text-sm text-gray-600 mt-1">
                ${order.items.map(item => `
                    <div>${item.name} x${item.quantity}</div>
                `).join('')}
            </div>
            <div class="text-xs text-gray-500 mt-1">
                ${new Date(order.timestamp).toLocaleTimeString()}
            </div>
        </div>
    `).join('') : '<div class="completed-order">No completed orders</div>';

    // Update daily total
    document.getElementById('daily-total').textContent = dailyTotal;

    // Refresh icons
    lucide.createIcons();
}

// Order Management Functions
function createOrder() {
    return {
        id: currentOrderId++,
        items: Object.entries(cart).map(([name, item]) => ({
            name,
            quantity: item.quantity,
            price: item.price,
            served: 0
        })),
        total: calculateTotal(cart),
        timestamp: new Date(),
        paid: false
    };
}

function checkOrderCompletion(order) {
    const allItemsServed = order.items.every(item => item.served === item.quantity);
    return allItemsServed && order.paid;
}

function handlePayment(orderId) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        order.paid = true;

        if (checkOrderCompletion(order)) {
            // Move to completed orders
            completedOrders.push({
                ...order,
                completedAt: new Date()
            });
            orders.splice(orderIndex, 1);
            dailyTotal += order.total;
            showNotification('Order completed and moved to completed orders!');
        } else {
            showNotification('Payment received successfully!');
        }

        hidePaymentModal();
        updateOrdersUI();
        saveState();
    }
}

function serveItem(orderId, itemName) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        const order = orders[orderIndex];
        const item = order.items.find(i => i.name === itemName);
        
        if (item && item.served < item.quantity) {
            item.served++;
            
            if (checkOrderCompletion(order)) {
                completedOrders.push({
                    ...order,
                    completedAt: new Date()
                });
                orders.splice(orderIndex, 1);
                dailyTotal += order.total;
                showNotification('Order completed!');
            } else {
                const allServed = order.items.every(item => item.served === item.quantity);
                showNotification(allServed ? 'All items served! Waiting for payment.' : 'Item served!');
            }

            updateOrdersUI();
            saveState();
        }
    }
}

// Modal Functions
function showConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const detailsContainer = document.getElementById('confirm-order-details');
    
    detailsContainer.innerHTML = `
        ${Object.entries(cart).map(([name, item]) => `
            <div class="cart-item">
                <span>${name} x${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `).join('')}
        <div class="cart-total">
            <span>Total</span>
            <span>₹${calculateTotal(cart)}</span>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function hideConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

function showPaymentModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('payment-modal');
    document.getElementById('payment-amount').textContent = order.total;
    modal.dataset.orderId = orderId;
    modal.style.display = 'flex';
}

function hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.dataset.orderId = '';
    modal.style.display = 'none';
}

// Category Management
function changeCategory(category) {
    activeCategory = category;
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.textContent.trim() === category);
    });
    updateMenuItems();
}

function updateMenuItems() {
    const menuItemsContainer = document.getElementById('menu-items');
    menuItemsContainer.innerHTML = menuCategories[activeCategory]
        .map(item => `
            <div class="menu-item">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>₹${item.price}</p>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn minus" onclick='updateQuantity(${JSON.stringify(item)}, -1)'>-</button>
                    <span>${cart[item.name]?.quantity || 0}</span>
                    <button class="qty-btn plus" onclick='updateQuantity(${JSON.stringify(item)}, 1)'>+</button>
                </div>
            </div>
        `).join('');
}

// State Persistence
function saveState() {
    const state = {
        currentOrderId,
        orders,
        completedOrders,
        dailyTotal
    };
    localStorage.setItem('posState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('posState');
    if (saved) {
        const state = JSON.parse(saved);
        currentOrderId = state.currentOrderId;
        orders = state.orders;
        completedOrders = state.completedOrders;
        dailyTotal = state.dailyTotal;
        updateOrdersUI();
    }
}

function placeOrder() {
    const newOrder = createOrder();
    orders.push(newOrder);
    cart = {};
    hideConfirmModal();
    showPaymentModal(newOrder.id);
    updateUI();
    updateOrdersUI();
    saveState();
}

// Fullscreen toggle
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Initialize
function initialize() {
    // Set current date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-IN', options);

    // Create category tabs
    const tabsContainer = document.getElementById('category-tabs');
    tabsContainer.innerHTML = Object.keys(menuCategories)
        .map(category => `
            <button class="tab ${category === activeCategory ? 'active' : ''}"
                    onclick="changeCategory('${category}')">${category}</button>
        `).join('');

    // Initialize menu items
    updateMenuItems();

    // Add event listeners
    document.getElementById('place-order-btn').addEventListener('click', showConfirmModal);
    document.getElementById('cancel-order').addEventListener('click', hideConfirmModal);
    document.getElementById('confirm-order').addEventListener('click', placeOrder);
    document.getElementById('payment-pending').addEventListener('click', hidePaymentModal);
    document.getElementById('payment-received').addEventListener('click', () => {
        const orderId = parseInt(document.getElementById('payment-modal').dataset.orderId);
        if (orderId) handlePayment(orderId);
    });

    // Load saved state
    loadState();
}

// Start the application
document.addEventListener('DOMContentLoaded', initialize);
