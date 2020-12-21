/** @format */

const mongoose = require('mongoose');
const supertest = require('supertest');
const helper = require('./test_helper');
const app = require('../app');
const bcrypt = require('bcrypt')

const api = supertest(app);

const Note = require('../models/note');
const User = require('../models/user');

beforeEach(async () => {
  await Note.deleteMany({});

  // const noteObjects = helper.initialNotes.map(note => new Note(note))

  // const promiseArray = noteObjects.map(note => note.save())
  // await Promise.all(promiseArray)

  for (let note of helper.initialNotes) {
    let noteObject = new Note(note)
    await noteObject.save()
  }
});

describe('when there is initially some notes saved', () => {
  test('notes are returned as json', async () => {
    console.log('entered test')
    await api
      .get('/api/notes')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });
  
  test('all notes are returned', async () => {
    const response = await api.get('/api/notes');
  
    expect(response.body).toHaveLength(helper.initialNotes.length);
  });
  
  test('a specific note is within the returned notes', async () => {
    const response = await api.get('/api/notes');
  
    const contents = response.body.map((r) => r.content);
    expect(contents).toContain('Browser can execute only Javascript');
  });
})

test('there are two notes', async () => {
  const response = await api.get('/api/notes');

  expect(response.body).toHaveLength(2);
});

test('the first note is about HTTP methods', async () => {
  const response = await api.get('/api/notes');

  expect(response.body[0].content).toBe('HTML is easy');
});

test('a valid note can be added', async () => {
  const newNote = {
    content: 'async/await simplifies making async calls',
    important: true,
  };

  await api
    .post('/api/notes')
    .send(newNote)
    .expect(200)
    .expect('Content-Type', /application\/json/);

  // const response = await api.get('/api/notes');

  // const contents = response.body.map((r) => r.content);

  // expect(response.body).toHaveLength(helper.initialNotes.length + 1);

  const notesAtEnd = await helper.notesInDb()
  
  expect(notesAtEnd).toHaveLength(helper.initialNotes.length + 1)

  const contents = notesAtEnd.map(n => n.content)
  
  expect(contents).toContain('async/await simplifies making async calls');
});

test('note without content is not added', async () => {
  const newNote = {
    important: true,
  };

  await api.post('/api/notes').send(newNote).expect(400);

  // const response = await api.get('/api/notes');
  const notesAtEnd = await helper.notesInDb()

  expect(notesAtEnd).toHaveLength(helper.initialNotes.length);
});

test('a specific note can be viewed', async () => {
  const notesAtStart = await helper.notesInDb()

  const noteView = notesAtStart[0]

  const resultNote = await api
    .get(`/api/notes/${noteView.id}`)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  const processedNoteToView = JSON.parse(JSON.stringify(noteView))

  expect(resultNote.body).toEqual(processedNoteToView)
})

test('a note can be deleted', async () => {
  const notesAtStart = await helper.notesInDb()
  const noteToDelete = notesAtStart[0]

  await api
    .delete(`/api/notes/${noteToDelete.id}`)
    .expect(204)

  const notesAtEnd = await helper.notesInDb()

  expect(notesAtEnd).toHaveLength(helper.initialNotes.length - 1)

  const contents = notesAtEnd.map(r => r.content)

  expect(contents).not.toContain(noteToDelete.content)
})

describe('when there is initially one user in db', () => {

  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const userAtStart = await helper.usersInDb()

    const newUser = {
      username: 'kraneo32',
      name: 'Oscar Oceguera',
      password: 'Anunakys'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const userAtEnd = await helper.usersInDb()
    expect(userAtEnd).toHaveLength(userAtStart.length + 1)

    const usernames = userAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('`username` to be unique')

    const usersAtEnd = await helper.usersInDb()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
})

afterAll(() => {
  mongoose.connection.close();
});
