from app import create_app

print("Starting the Flask application...")
app = create_app()

print("app created")

if __name__ == "__main__":
    app.run(host = '127.0.0.1',port = 5000 ,debug=True)
