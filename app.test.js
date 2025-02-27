const request = require('supertest');
const app = require('./app');  // Adjust the path to where your `app.js` is located
const jwt = require('jsonwebtoken');

describe('Product API', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ username: 'admin' }, 'test_jwt_secret_key', { expiresIn: '1h' });
  });

  describe('GET /products/:id', () => {
    it('should return 404 for non-existing product', async () => {
      const res = await request(app).get('/products/999');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should return a single product for a valid ID', async () => {
      const res = await request(app).get('/products/1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('description');
      expect(res.body).toHaveProperty('price');
      expect(res.body).toHaveProperty('imageUrl');
    });
  });

  describe('POST /products', () => {
    it('should create a new product with valid input', async () => {
      const product = {
        name: 'New Product',
        description: 'This is a new product',
        price: 10.99,
        imageUrl: 'http://example.com/product.jpg',
      };

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send(product);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(product.name);
    });

    it('should return 400 for missing required fields', async () => {
      const product = { name: '', description: '', price: 0, imageUrl: '' };

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send(product);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('All fields are required');
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow access to protected routes with a valid token', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Product A',
          description: 'Description of product A',
          price: 20.5,
          imageUrl: 'http://example.com/a.jpg',
        });

      expect(res.status).toBe(201);
    });

    it('should return 403 for missing or invalid token', async () => {
      const res = await request(app)
        .post('/products')
        .send({
          name: 'Product B',
          description: 'Description of product B',
          price: 15.5,
          imageUrl: 'http://example.com/b.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });
  });
});
