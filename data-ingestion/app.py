import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / '.env')

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from ingest import run_ingestion

app = Flask(__name__)

# CORS — restrict to known origins
CORS(app, origins=os.environ.get("CORS_ORIGIN", "http://localhost:3000").split(","))

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/ingest", methods=["POST"])
def ingest():
    if "file" not in request.files:
        return jsonify({"error": "CSV file required"}), 400

    file = request.files["file"]

    if not file.filename or not _allowed_file(file.filename):
        return jsonify({"error": "Only .csv files are accepted"}), 400

    # Check file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File exceeds 50 MB limit"}), 400

    safe_name = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, safe_name)

    file.save(file_path)

    try:
        result = run_ingestion(file_path)
        return jsonify({
            "status": "success",
            "success": True,
            "message": "CSV processed successfully",
            "totalRows": result["total_rows"],
            "validRows": result["valid_rows"],
            "invalidRows": result["invalid_rows"],
            "inserted": result["inserted"],
            "updated": result["updated"],
            "skipped": result["skipped"],
            "errors": len(result["errors"]),
            "insertErrors": result["errors"][:10] if result["errors"] else []
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "success": False,
            "message": str(e),
            "detail": traceback.format_exc().split('\n')[-3:]
        }), 500
    finally:
        # Always clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)