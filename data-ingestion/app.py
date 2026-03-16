from flask import Flask, request, jsonify
import os
from ingest import run_ingestion
from flask_cors import CORS
app = Flask(__name__)

CORS(app)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/ingest", methods=["POST"])
def ingest():

    if "file" not in request.files:
        return jsonify({"error": "CSV file required"}), 400

    file = request.files["file"]

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    file.save(file_path)

    try:

        rows = run_ingestion(file_path)

        return jsonify({
            "status": "success",
            "rows_inserted": rows
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == "__main__":
    app.run(port=5001, debug=True)