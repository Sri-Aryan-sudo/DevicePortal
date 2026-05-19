import os
import pandas as pd
import psycopg2
import re

# ==============================
# CONFIG — read from environment
# ==============================

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "database": os.environ.get("DB_NAME", "device-inventory"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "port": os.environ.get("DB_PORT", "5432"),
}

# ==============================
# COLUMN MAPPING
# ==============================

COLUMN_MAPPING = {
    "MAC": "mac_address",
    "Model": "model_name",
    "Model Alias": "model_alias",
    "Model Type": "model_type",
    "MCATS/ CATS": "cats_type",
    "Rack": "rack",
    "Location": "location_scope",
    "Location Site": "location_site",
    "Placement Type": "placement_type",
    "Team Name": "team_name",
    "Used for": "usage_purpose",
    "Device Owner (Primary)": "primary_owner",
    "Utilisation % Week 7 (Feb 9 to Feb 15)": "utilization_week_7",
    "Utilisation % Week 8 (Feb 16 to Feb 22)": "utilization_week_8",
    "Automatics Filter name": "automation_filter",
    "INFRA Tickets": "infra_tickets",
    "Device Repurpose": "device_repurpose"
}

DB_COLUMNS = [
    "mac_address","model_name","model_alias","model_type","device_type",
    "cats_type","vendor","rack","location_scope","location_site",
    "placement_type","team_name","usage_purpose","primary_owner",
    "utilization_week_7","utilization_week_8","automation_filter",
    "infra_tickets","device_repurpose"
]

# ==============================
# HELPERS
# ==============================

def safe_val(v):
    if pd.isna(v):
        return None
    if isinstance(v, str):
        v = v.strip()
        return v if v != "" else None
    return v


def is_valid_mac(mac):
    if mac is None:
        return False

    mac = str(mac).strip()
    pattern = r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'

    return re.match(pattern, mac) is not None


def extract_vendor(model_type):

    if model_type is None:
        return None

    text = str(model_type).strip()

    if "_" in text:
        return text.split("_")[0].upper()
    if "-" in text:
        return text.split("-")[0].upper()

    return text.upper()


# ==============================
# DEVICE TYPE LOGIC
# ==============================

def determine_device_type(row):

    text = ""

    if row.get("model_type"):
        text = str(row["model_type"]).upper()

        if "BOARD" in text:
            return "BOARD"

        if "PANEL" in text:
            return "PANEL"

    if row.get("model_name"):
        text = str(row["model_name"]).upper()

        if "BOARD" in text:
            return "BOARD"

        if "PANEL" in text:
            return "PANEL"

    if row.get("model_alias"):
        text = str(row["model_alias"]).upper()

        if "BOARD" in text:
            return "BOARD"

        if "PANEL" in text:
            return "PANEL"

    return "STB"


# ==============================
# DATA CLEANING
# ==============================

def clean_dataframe(file_path):

    df = pd.read_csv(file_path, encoding_errors='replace')

    df = df.loc[:, ~df.columns.duplicated()]

    df.columns = df.columns.str.strip()

    # Case-insensitive column mapping
    col_mapping_lower = {k.lower(): v for k, v in COLUMN_MAPPING.items()}
    rename_map = {}
    for col in df.columns:
        mapped = col_mapping_lower.get(col.lower())
        if mapped:
            rename_map[col] = mapped
    df = df.rename(columns=rename_map)

    df["device_type"] = df.apply(determine_device_type, axis=1)

    for col in DB_COLUMNS:
        if col not in df.columns:
            df[col] = None

    df = df[DB_COLUMNS]

    for col in df.columns:
        df[col] = df[col].apply(safe_val)

    df = df[df["mac_address"].apply(is_valid_mac)]

    df["vendor"] = df["model_type"].apply(extract_vendor)

    return df


# ==============================
# DB INSERTION
# ==============================

def insert_into_db(df):

    conn = psycopg2.connect(**DB_CONFIG)
    inserted = 0
    updated = 0
    skipped = 0
    errors = []

    try:
        cursor = conn.cursor()

        update_cols = [c for c in DB_COLUMNS if c != 'mac_address']
        update_set = ', '.join([f"{c} = EXCLUDED.{c}" for c in update_cols])
        update_where = ' OR '.join([f"devices.{c} IS DISTINCT FROM EXCLUDED.{c}" for c in update_cols])

        insert_query = f"""
            INSERT INTO devices ({','.join(DB_COLUMNS)})
            VALUES ({','.join(['%s'] * len(DB_COLUMNS))})
            ON CONFLICT (mac_address) DO UPDATE SET {update_set}
            WHERE {update_where}
            RETURNING (xmax = 0) AS was_inserted;
        """

        data = [tuple(row) for row in df.values]

        for i, row in enumerate(data):
            try:
                cursor.execute(insert_query, row)
                result = cursor.fetchone()
                if result is None:
                    # ON CONFLICT matched but WHERE clause was false → no changes
                    skipped += 1
                elif result[0]:
                    inserted += 1
                else:
                    updated += 1
            except Exception as e:
                mac = row[0] if row else "unknown"
                errors.append({"row": i + 2, "mac": mac, "error": str(e)})

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors
    }


# ==============================
# INGESTION PIPELINE
# ==============================

def run_ingestion(file_path):

    df = clean_dataframe(file_path)

    total_rows = len(df)

    # Count rows filtered out by MAC validation
    raw_df = pd.read_csv(file_path)
    raw_count = len(raw_df)
    invalid_mac_count = raw_count - total_rows

    db_result = insert_into_db(df)

    return {
        "total_rows": raw_count,
        "valid_rows": total_rows,
        "invalid_rows": invalid_mac_count,
        "inserted": db_result["inserted"],
        "updated": db_result["updated"],
        "skipped": db_result["skipped"],
        "errors": db_result["errors"]
    }