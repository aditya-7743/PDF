# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['E:/Codex/PDF tools/desktop_app.py'],
    pathex=[],
    binaries=[],
    datas=[('E:/Codex/PDF tools/index.html', '.'), ('E:/Codex/PDF tools/styles.css', '.'), ('E:/Codex/PDF tools/src', 'src')],
    hiddenimports=['webview.platforms.edgechromium', 'clr', 'pythonnet'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ImageTools',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['E:/Codex/PDF tools/app_icon.ico'],
)
