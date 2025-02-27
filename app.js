const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();

app.use(bodyParser.json());

const db = new sqlite3.Database('./productCatalog.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS  products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      imageUrl TEXT NOT NULL
    )
  `);
});

const user = {
  username: 'admin',
  password: bcrypt.hashSync('password123', 10), 
};

// JWT secret key
const JWT_SECRET = 'test_jwt_secret_key';

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ message: 'Product not found' });
    res.json(row);
  });
});

app.post('/products', authenticateJWT, (req, res) => {
  const { name, description, price, imageUrl } = req.body;
  if (!name || !description || !price || !imageUrl) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const stmt = db.prepare('INSERT INTO products (name, description, price, imageUrl) VALUES (?, ?, ?, ?)');
  stmt.run(name, description, price, imageUrl, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, description, price, imageUrl });
  });
});

app.put('/products/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { name, description, price, imageUrl } = req.body;

  if (!name || !description || !price || !imageUrl) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const stmt = db.prepare('UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ? WHERE id = ?');
  stmt.run(name, description, price, imageUrl, id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ id, name, description, price, imageUrl });
  });
});

app.delete('/products/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  stmt.run(id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  });
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== user.username) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});


// cmd need to run 
// npm install express sqlite3 jsonwebtoken bcryptjs body-parser
// for test npm install --save-dev jest supertest
