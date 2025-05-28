import path from 'path';
import express from 'express';
import cors from 'cors';
import bankStatementRoutes from './routes/bankStatementRoutes.js';
import { promises as fs } from 'fs';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch((err) =>
  console.error('Error creating uploads directory:', err)
);

// Routes
app.use('/api', bankStatementRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
