"""Game Test Tracker - Flask application factory."""

from flask import Flask, send_from_directory
import os

from .routes import api
from .models import init_db

def create_app():
    app = Flask(__name__, static_folder="static")
    app.config.from_object("app.config.Config")

    # Initialize database
    init_db()

    # Register API blueprint
    app.register_blueprint(api, url_prefix="/api")

    # Serve static files
    @app.route("/")
    def index():
        return send_from_directory("static", "index.html")

    @app.route("/static/<path:filename>")
    def static_files(filename):
        return send_from_directory("static", filename)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
