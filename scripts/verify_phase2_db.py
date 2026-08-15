import json
import sqlite3
import sys


def main() -> None:
    connection = sqlite3.connect(sys.argv[1])
    try:
        setting = lambda key: connection.execute(
            "SELECT value FROM app_settings WHERE key = ?", (key,)
        ).fetchone()[0]
        count = lambda table: connection.execute(
            f"SELECT COUNT(*) FROM {table}"
        ).fetchone()[0]
        print(json.dumps({
            "schemaVersion": setting("database.schemaVersion"),
            "seedVersion": setting("seed.corePricingVersion"),
            "categories": count("service_categories"),
            "services": count("services"),
            "rules": count("pricing_rules"),
        }, ensure_ascii=False))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
