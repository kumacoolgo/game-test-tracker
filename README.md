# Game Test Tracker

A Flask-based task tracker for game testing with reorder support.

## Features

- User authentication (admin/admin123)
- CRUD operations for test tasks
- Up/Down reordering via sort_order field
- Dark theme UI with modal dialogs

## Quick Start

```bash
pip install -r requirements.txt
python -m app
```

## Docker

```bash
docker build -t game-test-tracker .
docker run -p 5000:5000 game-test-tracker
```

## API

- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/me` - Current user
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task
- `PUT /api/tasks/reorder` - Reorder task (direction: up/down)
