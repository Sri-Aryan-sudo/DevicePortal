import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import re

# ==============================
# CONFIG
# ==============================

DB_CONFIG = {
    "host": "localhost",
    "database": "device-inventory",
    "user": "postgres",
    "password": "1234",
    "port": "5432"
}

OUTPUT_PREVIEW_FILE = "devices_preview_output.csv"

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
    "Device Owner (Primary)": "owner_name",
    "Utilisation % Week 7 (Feb 9 to Feb 15)": "utilization_week_7",
    "Utilisation % Week 8 (Feb 16 to Feb 22)": "utilization_week_8",
    "Automatics Filter name": "automation_filter",
    "INFRA Tickets": "infra_tickets",
    "Device Repurpose": "device_repurpose"
}

DB_COLUMNS = [
    "mac_address","model_name","model_alias","model_type","device_type",
    "cats_type","vendor","rack","location_scope","location_site",
    "placement_type","team_name","usage_purpose","owner_name",
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
        return text.split("_")[0]
    if "-" in text:
        return text.split("-")[0]

    return text


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

    df = pd.read_csv(file_path)

    df = df.loc[:, ~df.columns.duplicated()]

    df.columns = df.columns.str.strip()

    df = df.rename(columns=COLUMN_MAPPING)

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

    cursor = conn.cursor()

    update_cols = [c for c in DB_COLUMNS if c != 'mac_address']
    update_set = ', '.join([f"{c} = EXCLUDED.{c}" for c in update_cols])
    update_where = ' OR '.join([f"devices.{c} IS DISTINCT FROM EXCLUDED.{c}" for c in update_cols])

    insert_query = f"""
        INSERT INTO devices ({','.join(DB_COLUMNS)})
        VALUES ({','.join(['%s'] * len(DB_COLUMNS))})
        ON CONFLICT (mac_address) DO UPDATE SET {update_set}
        WHERE {update_where};
    """

    data = [tuple(row) for row in df.values]

    execute_batch(cursor, insert_query, data)

    conn.commit()

    cursor.close()

    conn.close()


# ==============================
# INGESTION PIPELINE
# ==============================

def run_ingestion(file_path):

    df = clean_dataframe(file_path)

    insert_into_db(df)

    

    return len(df)