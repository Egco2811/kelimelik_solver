import os
from flask import Flask, render_template
from dotenv import load_dotenv

load_dotenv()  # load .env file if present

app = Flask(__name__)
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port)
