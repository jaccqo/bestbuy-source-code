import os
import pandas as pd
from utils.logging import write_log

COLUMN_MAP = {
    # Core fields — cover common variations
    "price": ["SITE PRICE", "PRICE", "CURRENT PRICE", "LIST PRICE"],
    "availability": ["AVAILABILITY", "STOCK", "IN STOCK", "CONDITION", "STOCK STATUS"],
    "title": ["PRODUCT NAME", "TITLE", "NAME", "ITEM NAME"],
    "brand": ["BRAND", "MANUFACTURER"],
    "model": ["MODEL", "MODEL NUMBER", "MPN", "MANUFACTURERSKU"],

    # Nested extra specs — common column names
    "dimensions_height": ["HEIGHT", "PRODUCT HEIGHT"],
    "dimensions_width": ["WIDTH", "PRODUCT WIDTH"],
    "dimensions_depth": ["DEPTH", "PRODUCT DEPTH"],
    "dimensions_weight": ["WEIGHT", "PRODUCT WEIGHT"],
    "warranty_parts": ["WARRANTY PARTS", "PARTS WARRANTY", "WARRANTY - PARTS"],
    "warranty_labor": ["WARRANTY LABOR", "LABOR WARRANTY", "WARRANTY - LABOR"],
    "color": ["COLOR", "COLOUR"],
    "upc": ["UPC", "UPC CODE"],
}

def load_sheet(db, uploaded, sku_column, update_original):
    if not update_original or not uploaded.local_filepath:
        return None, None, {}

    if not os.path.exists(uploaded.local_filepath):
        write_log(db, "WARNING", "Original sheet file missing")
        return None, None, {}

    sheet_df = pd.read_excel(uploaded.local_filepath)
    column_lookup = {c.upper(): c for c in sheet_df.columns}

    if sku_column.upper() not in column_lookup:
        write_log(db, "WARNING", "SKU column missing in original sheet")
        return None, None, {}

    sheet_sku_col = column_lookup[sku_column.upper()]
    sheet_df[sheet_sku_col] = sheet_df[sheet_sku_col].astype(str).str.strip()

    updatable_columns = {}
    for field, aliases in COLUMN_MAP.items():
        for alias in aliases:
            if alias in column_lookup:
                updatable_columns[field] = column_lookup[alias]
                break

    write_log(
        db,
        "INFO",
        f"Sheet loaded — writable columns: {list(updatable_columns.values())}",
    )

    return sheet_df, sheet_sku_col, updatable_columns



def update_sheet_row(db, sheet_df, sheet_sku_col, updatable_columns, sku, result):
    if sheet_df is None or not updatable_columns:
        return

    mask = sheet_df[sheet_sku_col] == sku
    if not mask.any():
        write_log(db, "WARNING", f"SKU {sku} not found in sheet")
        return

    updated = []

    # 1. Core fields (existing)
    for field, col in updatable_columns.items():
        if field in ["price", "availability", "title", "brand", "model"]:
            value = result.get(field)
            if value is not None:
                sheet_df.loc[mask, col] = value
                updated.append(col)

    # 2. Extra specifications from nested dict
    extra_specs = result.get("specs", {})

    # Helper to get value from nested dict safely
    def get_spec(section, key):
        return extra_specs.get(section, {}).get(key)

    # Map your new COLUMN_MAP fields to nested paths
    extra_mapping = {
        "dimensions_height": ("Dimensions", "Product Height"),
        "dimensions_width": ("Dimensions", "Product Width"),
        "dimensions_depth": ("Dimensions", "Product Depth"),
        "dimensions_weight": ("Dimensions", "Product Weight"),
        "warranty_parts": ("Warranty", "Warranty - Parts"),
        "warranty_labor": ("Warranty", "Warranty - Labor"),
        "color": ("General", "Color"),
        "upc": ("Other", "UPC"),
    }

    for field, col in updatable_columns.items():
        if field in extra_mapping:
            section, key = extra_mapping[field]
            value = get_spec(section, key)
            if value is not None:
                sheet_df.loc[mask, col] = value
                updated.append(col)

    if updated:
        write_log(db, "INFO", f"Sheet updated for SKU {sku}: {', '.join(updated)}")