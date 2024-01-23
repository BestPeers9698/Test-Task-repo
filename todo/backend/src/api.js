const express = require('express');
const { v4: generateId } = require('uuid');
const database = require('./database');

const app = express();

function requestLogger(req, res, next) {
  res.once('finish', () => {
    const log = [req.method, req.path];
    if (req.body && Object.keys(req.body).length > 0) {
      log.push(JSON.stringify(req.body));
    }
    if (req.query && Object.keys(req.query).length > 0) {
      log.push(JSON.stringify(req.query));
    }
    log.push('->', res.statusCode);
    // eslint-disable-next-line no-console
    console.log(log.join(' '));
  });
  next();
}

app.use(requestLogger);
app.use(require('cors')());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.get('/', async (req, res) => {
  const todos = database.client.db('todos').collection('todos');
  const response = await todos.find({}).toArray();
  res.status(200);
  res.json(response);
});


app.post('/', async (req, res) => {
  const { text, dueDate } = req.body;

  if (typeof text !== 'string') {
    res.status(400);
    res.json({ message: "invalid 'text' expected string" });
    return;
  }

  const timestampIndex = new Date().getTime(); 

  const todo = { id: generateId(), text, completed: false, dueDate, index: timestampIndex };
  await database.client.db('todos').collection('todos').insertOne(todo);
  res.status(201);
  res.json(todo);
});

app.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const pageSize = 20; 

  const skip = (page - 1) * pageSize;

  const todosCollection = database.client.db('todos').collection('todos');
  const response = await todosCollection.find({}).skip(skip).limit(pageSize).toArray();

  res.status(200);
  res.json(response);
});


app.post('/reorder-tasks', async (req, res) => {
  const { newOrder } = req.body;

  if (!Array.isArray(newOrder)) {
    res.status(400);
    res.json({ message: "Invalid 'newOrder' parameter. Expected an array." });
    return;
  }

  const todosCollection = database.client.db('todos').collection('todos');

  for (let i = 0; i < newOrder.length; i++) {
    const taskId = newOrder[i];
    await todosCollection.updateOne({ id: taskId }, { $set: { index: i } });
  }

  res.status(200);
  res.json({ message: 'Tasks reordered successfully.' });
});


app.get('/:id', async (req, res) => {
  const { id } = req.params;
  const todo = await database.client.db('todos').collection('todos').findOne({ id });

  if (!todo) {
    res.status(404);
    res.json({ message: "Todo not found" });
    return;
  }

  res.status(200);
  res.json(todo);
});

app.get('/due-today', async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todos = await database.client.db('todos').collection('todos')
    .find({ dueDate: today })
    .toArray();

  res.status(200);
  res.json(todos);
});


app.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    res.status(400);
    res.json({ message: "invalid 'completed' expected boolean" });
    return;
  }
  await database.client.db('todos').collection('todo').updateOne(
    { id },
    { $set: { completed } },
  );
  res.status(200);
  res.end();
});

app.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await database.client.db('todos').collection('todos').deleteOne({ id });
  res.status(203);
  res.end();
});

module.exports = app;
