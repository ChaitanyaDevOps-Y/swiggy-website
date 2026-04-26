const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data storage (in-memory for demo)
let restaurants = [];
let cart = [];
let orders = [];
let users = [];

// Load restaurant data
try {
    const restaurantData = fs.readFileSync('./data/restaurants.json', 'utf8');
    restaurants = JSON.parse(restaurantData);
} catch (error) {
    console.log('Using default restaurant data');
    restaurants = require('./data/restaurants.json');
}

// API Routes
app.get('/api/restaurants', (req, res) => {
    const { search, cuisine, sort } = req.query;
    let filtered = [...restaurants];
    
    if (search) {
        filtered = filtered.filter(r => 
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.cuisine.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    if (cuisine && cuisine !== 'all') {
        filtered = filtered.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase());
    }
    
    if (sort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'price') {
        filtered.sort((a, b) => a.priceForTwo - b.priceForTwo);
    }
    
    res.json(filtered);
});

app.get('/api/restaurant/:id', (req, res) => {
    const restaurant = restaurants.find(r => r.id === parseInt(req.params.id));
    if (restaurant) {
        res.json(restaurant);
    } else {
        res.status(404).json({ error: 'Restaurant not found' });
    }
});

app.get('/api/menu/:restaurantId', (req, res) => {
    const restaurant = restaurants.find(r => r.id === parseInt(req.params.restaurantId));
    if (restaurant && restaurant.menu) {
        res.json(restaurant.menu);
    } else {
        res.status(404).json({ error: 'Menu not found' });
    }
});

app.post('/api/cart/add', (req, res) => {
    const { itemId, name, price, quantity, restaurantId, restaurantName } = req.body;
    
    const existingItem = cart.find(item => item.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: itemId,
            name,
            price,
            quantity,
            restaurantId,
            restaurantName
        });
    }
    
    res.json({ success: true, cart });
});

app.put('/api/cart/update/:itemId', (req, res) => {
    const { quantity } = req.body;
    const itemId = req.params.itemId;
    
    const item = cart.find(item => item.id === itemId);
    if (item) {
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== itemId);
        } else {
            item.quantity = quantity;
        }
    }
    
    res.json({ success: true, cart });
});

app.delete('/api/cart/remove/:itemId', (req, res) => {
    cart = cart.filter(item => item.id !== req.params.itemId);
    res.json({ success: true, cart });
});

app.get('/api/cart', (req, res) => {
    res.json(cart);
});

app.post('/api/order/place', (req, res) => {
    const { userId, address, paymentMethod, totalAmount } = req.body;
    
    if (cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const order = {
        orderId: uuidv4(),
        userId: userId || 'guest',
        items: [...cart],
        address,
        paymentMethod,
        totalAmount,
        status: 'confirmed',
        orderDate: new Date(),
        estimatedDelivery: new Date(Date.now() + 30 * 60000) // 30 minutes
    };
    
    orders.push(order);
    cart = [];
    
    res.json({ success: true, order });
});

app.get('/api/orders/:userId', (req, res) => {
    const userOrders = orders.filter(o => o.userId === req.params.userId);
    res.json(userOrders);
});

app.post('/api/register', (req, res) => {
    const { email, password, name, phone } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const userId = uuidv4();
    users.push({
        userId,
        email,
        password, // In production, hash this with bcrypt
        name,
        phone
    });
    
    res.json({ success: true, userId, name });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, userId: user.userId, name: user.name });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Serve HTML page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
