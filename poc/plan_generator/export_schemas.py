"""Export the data contract (models.py) to JSON Schema files in /schemas.

Usage:
  python export_schemas.py          # rewrite the schema files
  python export_schemas.py --check  # exit 1 if the files are out of date (run before committing)
"""

import json
import sys

from generate_plan import HERE
from models import Plan, Profile

SCHEMA_DIR = HERE.parent.parent / "schemas"
CONTRACT = {"profile.v1.json": Profile, "plan.v1.json": Plan}


def render(model) -> str:
    schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", **model.model_json_schema()}
    return json.dumps(schema, indent=2, ensure_ascii=False) + "\n"


def main() -> None:
    check = "--check" in sys.argv
    stale = []
    for filename, model in CONTRACT.items():
        path = SCHEMA_DIR / filename
        text = render(model)
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current == text:
            continue
        if check:
            stale.append(filename)
        else:
            SCHEMA_DIR.mkdir(exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")
            print(f"wrote schemas/{filename}")
    if stale:
        sys.exit(f"Out of date: {', '.join(stale)}. Run: python export_schemas.py")
    print("schemas are up to date" if check else "done")


if __name__ == "__main__":
    main()
