const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
// Days after completion when each spaced-repetition revision should happen.
const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 120];
const UPDATABLE_TASK_FIELDS = ['title', 'subject', 'description', 'status', 'priority', 'dueDate'];

const revisionSchema = new mongoose.Schema(
  {
    revisionNumber: { type: Number, required: true },
    targetDate: { type: Date, required: true },
    isDone: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Under Review', 'Completed'],
    default: 'To Do',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  dueDate: { type: Date, default: null },
  completionDate: { type: Date, default: null },
  revisions: { type: [revisionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model('Task', taskSchema);

const generateRevisions = (completionDate) =>
  REVISION_INTERVALS.map((interval, index) => {
    const targetDate = new Date(completionDate);
    targetDate.setDate(targetDate.getDate() + interval);
    return {
      revisionNumber: index + 1,
      targetDate,
      isDone: false,
    };
  });

app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.static(path.join(__dirname)));

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

app.post('/api/tasks', async (req, res) => {
  try {
    const task = new Task(req.body);
    const savedTask = await task.save();
    return res.status(201).json(savedTask);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const previousStatus = task.status;

    UPDATABLE_TASK_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    if (task.status === 'Completed' && previousStatus !== 'Completed') {
      task.completionDate = new Date();
      task.revisions = generateRevisions(task.completionDate);
    } else if (task.status !== 'Completed' && previousStatus === 'Completed') {
      task.completionDate = null;
      task.revisions = [];
    }

    const updatedTask = await task.save();
    return res.json(updatedTask);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.patch('/api/tasks/:id/revision/:revisionId', async (req, res) => {
  if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.revisionId)) {
    return res.status(400).json({ error: 'Invalid task or revision id' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const revision = task.revisions.id(req.params.revisionId);
    if (!revision) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    revision.isDone = !revision.isDone;
    await task.save();
    return res.json(task);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid task id' });
  }

  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment');
  }
  await mongoose.connect(MONGODB_URI);
};

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to connect to MongoDB:', error.message);
      process.exit(1);
    });
}

module.exports = { app, Task, generateRevisions, REVISION_INTERVALS, connectDB };
