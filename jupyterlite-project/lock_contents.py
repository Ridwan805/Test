import json
import shutil
from pathlib import Path

project_dir = Path(__file__).resolve().parent
public_lite_dir = project_dir.parent / "frontend" / "public" / "lite"
all_json_path = public_lite_dir / "api" / "contents" / "all.json"

# 1. Lock all master notebooks as non-writable
if all_json_path.exists():
    data = json.loads(all_json_path.read_text(encoding="utf-8"))
    for item in data.get("content", []):
        item["writable"] = False
    all_json_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[lock_contents] Successfully marked {len(data.get('content', []))} notebook(s) as non-writable/read-only.")
else:
    print(f"[lock_contents] Warning: {all_json_path} not found.")

# 2. Copy lite-auth-guard.js into public/lite/
guard_src = project_dir / "lite-auth-guard.js"
guard_dst = public_lite_dir / "lite-auth-guard.js"
if guard_src.exists():
    shutil.copyfile(guard_src, guard_dst)
    print(f"[lock_contents] Copied lite-auth-guard.js to {guard_dst}")

# 3. Inject script tag into all JupyterLite HTML files
html_targets = [
    (public_lite_dir / "notebooks" / "index.html", "../lite-auth-guard.js"),
    (public_lite_dir / "lab" / "index.html", "../lite-auth-guard.js"),
    (public_lite_dir / "repl" / "index.html", "../lite-auth-guard.js"),
    (public_lite_dir / "consoles" / "index.html", "../lite-auth-guard.js"),
    (public_lite_dir / "edit" / "index.html", "../lite-auth-guard.js"),
    (public_lite_dir / "index.html", "./lite-auth-guard.js"),
]

for html_file, relative_script_path in html_targets:
    if html_file.exists():
        content = html_file.read_text(encoding="utf-8")
        script_tag = f'<script src="{relative_script_path}"></script>'
        if "lite-auth-guard.js" not in content:
            if "</head>" in content:
                content = content.replace("</head>", f"  {script_tag}\n</head>")
            else:
                content = content.replace("<body", f"{script_tag}\n<body")
            html_file.write_text(content, encoding="utf-8")
            print(f"[lock_contents] Injected lite-auth-guard into {html_file.name}")
        else:
            print(f"[lock_contents] lite-auth-guard already present in {html_file.name}")
