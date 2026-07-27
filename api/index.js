const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('../routes/auth');
const taskRoutes = require('../routes/tasks');
const notificationRoutes = require('../routes/notifications');
const userRoutes = require('../routes/users');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
