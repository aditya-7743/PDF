import os
import sys
import socket
import threading
import http.server
import socketserver
import urllib.parse
import json
import base64
import tempfile
import subprocess
import webview
import mimetypes

import clr
clr.AddReference("System")
clr.AddReference("System.Windows.Forms")
import System
import System.Threading as ST
import System.Windows.Forms as WinForms
from webview.platforms.winforms import OpenFolderDialog

# Guarantee correct MIME types on Windows
mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")

def get_base_dir():
    """Get absolute path to resource, works for dev and for PyInstaller"""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def show_save_dialog_sta(default_filename="", file_types=None):
    """Show native Windows SaveFileDialog on an isolated STA thread without locking parent window"""
    selected_path = [None]
    def _dlg():
        try:
            dialog = WinForms.SaveFileDialog()
            dialog.RestoreDirectory = True
            dialog.OverwritePrompt = True
            dialog.CheckPathExists = True
            dialog.FileName = os.path.basename(default_filename) if default_filename else ""
            if file_types:
                dialog.Filter = file_types
            else:
                ext = os.path.splitext(default_filename)[1].lower() if default_filename else ""
                if ext == ".pdf":
                    dialog.Filter = "PDF Documents (*.pdf)|*.pdf|All files (*.*)|*.*"
                elif ext == ".png":
                    dialog.Filter = "PNG Images (*.png)|*.png|All files (*.*)|*.*"
                elif ext in [".jpg", ".jpeg"]:
                    dialog.Filter = "JPEG Images (*.jpg;*.jpeg)|*.jpg;*.jpeg|All files (*.*)|*.*"
                elif ext == ".webp":
                    dialog.Filter = "WebP Images (*.webp)|*.webp|All files (*.*)|*.*"
                else:
                    dialog.Filter = "All files (*.*)|*.*"

            result = dialog.ShowDialog()
            if result == WinForms.DialogResult.OK:
                selected_path[0] = str(dialog.FileName)
            dialog.Dispose()
        except Exception as e:
            print("Save dialog error:", e, flush=True)

    t = ST.Thread(ST.ThreadStart(_dlg))
    t.SetApartmentState(ST.ApartmentState.STA)
    t.Start()
    t.Join()
    return selected_path[0]

def show_folder_dialog_sta(title="Select Destination Folder"):
    """Show modern Windows Folder Picker on an isolated STA thread without locking parent window"""
    selected_folder = [None]
    def _dlg():
        try:
            openFileDialog = WinForms.OpenFileDialog()
            openFileDialog.Title = title
            openFileDialog.Filter = OpenFolderDialog.foldersFilter
            openFileDialog.AddExtension = False
            openFileDialog.CheckFileExists = False
            openFileDialog.CheckPathExists = True
            openFileDialog.DereferenceLinks = True
            openFileDialog.Multiselect = False
            openFileDialog.RestoreDirectory = True

            iFileDialog = OpenFolderDialog.createVistaDialogMethodInfo.Invoke(openFileDialog, [])
            OpenFolderDialog.onBeforeVistaDialogMethodInfo.Invoke(openFileDialog, [iFileDialog])
            options = OpenFolderDialog.getOptionsMethodInfo.Invoke(openFileDialog, [])
            options = options.op_BitwiseOr(OpenFolderDialog.fosPickFoldersBitFlag)
            OpenFolderDialog.setOptionsMethodInfo.Invoke(iFileDialog, [options])

            adviseParams = System.Array[System.Object]([
                OpenFolderDialog.vistaDialogEventsConstructorInfo.Invoke([openFileDialog]),
                System.UInt32(0)
            ])
            OpenFolderDialog.adviseMethodInfo.Invoke(iFileDialog, adviseParams)
            dwCookie = adviseParams.GetValue(1)

            try:
                result = OpenFolderDialog.showMethodInfo.Invoke(iFileDialog, [System.IntPtr.Zero])
                if result == 0 and openFileDialog.FileNames and len(openFileDialog.FileNames) > 0:
                    selected_folder[0] = str(openFileDialog.FileNames[0])
            finally:
                OpenFolderDialog.unadviseMethodInfo.Invoke(iFileDialog, [System.UInt32(dwCookie)])
                openFileDialog.Dispose()
        except Exception:
            try:
                dialog = WinForms.FolderBrowserDialog()
                dialog.Description = title
                dialog.ShowNewFolderButton = True
                result = dialog.ShowDialog()
                if result == WinForms.DialogResult.OK:
                    selected_folder[0] = str(dialog.SelectedPath)
                dialog.Dispose()
            except Exception as ex:
                print("Folder dialog error:", ex, flush=True)

    t = ST.Thread(ST.ThreadStart(_dlg))
    t.SetApartmentState(ST.ApartmentState.STA)
    t.Start()
    t.Join()
    return selected_folder[0]

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=get_base_dir(), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        pass

    def do_POST(self):
        """High-speed binary upload endpoint directly writing to target file without Base64 overhead"""
        if self.path == "/api/save_file":
            try:
                raw_target = self.headers.get("X-Target-Path", "")
                target_path = urllib.parse.unquote(raw_target)
                if not target_path:
                    self.send_error(400, "Missing X-Target-Path header")
                    return

                parent_dir = os.path.dirname(target_path)
                if parent_dir:
                    os.makedirs(parent_dir, exist_ok=True)

                content_length = int(self.headers.get("Content-Length", 0))
                remaining = content_length
                with open(target_path, "wb") as f:
                    while remaining > 0:
                        chunk_size = min(remaining, 65536)
                        chunk = self.rfile.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        remaining -= len(chunk)

                resp_data = json.dumps({
                    "success": True,
                    "path": target_path,
                    "filename": os.path.basename(target_path),
                    "size": content_length
                }).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        elif self.path == "/api/preview_pdf":
            try:
                raw_name = self.headers.get("X-Filename", "preview.pdf")
                filename = urllib.parse.unquote(raw_name)
                if not filename.lower().endswith(".pdf"):
                    filename += ".pdf"

                temp_dir = tempfile.gettempdir()
                temp_path = os.path.join(temp_dir, f"preview_{os.path.basename(filename)}")

                content_length = int(self.headers.get("Content-Length", 0))
                remaining = content_length
                with open(temp_path, "wb") as f:
                    while remaining > 0:
                        chunk_size = min(remaining, 65536)
                        chunk = self.rfile.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        remaining -= len(chunk)

                try:
                    os.startfile(temp_path)
                except Exception as ex:
                    print("Could not start default viewer:", ex, flush=True)

                resp_data = json.dumps({
                    "success": True,
                    "path": temp_path,
                    "filename": os.path.basename(temp_path)
                }).encode("utf-8")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        self.send_error(404, "Unknown API endpoint")

class DesktopApi:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def choose_save_path(self, default_filename="", file_types=None):
        """Immediately open native Windows SaveFileDialog on STA thread"""
        try:
            path = show_save_dialog_sta(default_filename, file_types)
            if not path:
                return {"success": False, "cancelled": True}
            return {"success": True, "path": path, "filename": os.path.basename(path)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def choose_folder(self, title="Select Destination Folder"):
        """Immediately open native Windows Folder Picker on STA thread"""
        try:
            folder = show_folder_dialog_sta(title)
            if not folder:
                return {"success": False, "cancelled": True}
            return {"success": True, "folder": folder}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_path(self, path):
        """Reveal file or folder in File Explorer"""
        try:
            if not path:
                return {"success": False}
            if os.path.isfile(path):
                subprocess.Popen(f'explorer /select,"{path}"')
            elif os.path.isdir(path):
                os.startfile(path)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def save_file(self, filename, base64_data):
        """Fallback: save single file using native dialog and base64"""
        try:
            save_path = show_save_dialog_sta(filename)
            if not save_path:
                return {"success": False, "cancelled": True}

            data = base64.b64decode(base64_data)
            with open(save_path, "wb") as f:
                f.write(data)

            return {"success": True, "path": save_path, "filename": os.path.basename(save_path)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def save_multiple_files(self, files):
        """Fallback: save multiple base64 files into chosen folder"""
        try:
            folder = show_folder_dialog_sta("Select folder to save files")
            if not folder:
                return {"success": False, "cancelled": True}

            saved_count = 0
            for item in files:
                name = os.path.basename(item.get("filename", "output.dat"))
                target_path = os.path.join(folder, name)
                data = base64.b64decode(item.get("base64", ""))
                with open(target_path, "wb") as f:
                    f.write(data)
                saved_count += 1

            try:
                os.startfile(folder)
            except Exception:
                pass

            return {"success": True, "count": saved_count, "folder": folder}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def preview_pdf(self, filename, base64_data):
        """Fallback: save base64 PDF to %TEMP% and launch in Windows viewer"""
        try:
            name = os.path.basename(filename)
            if not name.lower().endswith(".pdf"):
                name += ".pdf"
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"preview_{name}")
            data = base64.b64decode(base64_data)
            with open(temp_path, "wb") as f:
                f.write(data)

            os.startfile(temp_path)
            return {"success": True, "path": temp_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def start_server(port):
    with ThreadedHTTPServer(("127.0.0.1", port), NoCacheHTTPRequestHandler) as httpd:
        httpd.serve_forever()

def main():
    webview.settings['ALLOW_DOWNLOADS'] = True

    port = find_free_port()
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    url = f"http://127.0.0.1:{port}/index.html?app=image-tools"

    api = DesktopApi()
    window = webview.create_window(
        title="Image Tools - Image to PDF & Resizer",
        url=url,
        width=1240,
        height=840,
        min_size=(920, 600),
        text_select=True,
        js_api=api
    )
    api.set_window(window)

    webview.start(gui="edgechromium", debug=False)

if __name__ == "__main__":
    main()
