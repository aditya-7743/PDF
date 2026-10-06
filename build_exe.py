import os
import sys
import PyInstaller.__main__

base_dir = os.path.dirname(os.path.abspath(__file__))
icon_path = os.path.join(base_dir, "app_icon.ico")

args = [
    os.path.join(base_dir, "desktop_app.py"),
    "--name=ImageTools",
    "--onefile",
    "--windowed",
    "--clean",
    "--noconfirm",
    f"--add-data={os.path.join(base_dir, 'index.html')};.",
    f"--add-data={os.path.join(base_dir, 'styles.css')};.",
    f"--add-data={os.path.join(base_dir, 'src')};src",
    "--hidden-import=webview.platforms.edgechromium",
    "--hidden-import=clr",
    "--hidden-import=pythonnet",
]

if os.path.exists(icon_path):
    args.append(f"--icon={icon_path}")

print("Building ImageTools.exe with args:", args)
PyInstaller.__main__.run(args)
