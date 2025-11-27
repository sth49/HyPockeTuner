#!/usr/bin/env python3
"""
Generate PNG icons from SVG favicon for HyPockeTuner
"""

import subprocess
import os

# Ensure we're in the right directory
os.chdir('/home/donghee/HyPockeTuner_new/client/public')

# Icon sizes needed
sizes = [
    (16, 'favicon-16x16.png'),
    (32, 'favicon-32x32.png'),
    (48, 'icon-48.png'),
    (72, 'icon-72.png'),
    (144, 'icon-144.png'),
    (192, 'icon-192.png'),
    (192, 'logo192.png'),
    (256, 'icon-256.png'),
    (512, 'icon-512.png'),
    (512, 'logo512.png'),
    (180, 'apple-touch-icon.png'),
]

svg_file = 'favicon.svg'

for size, filename in sizes:
    try:
        # Use rsvg-convert if available, otherwise try inkscape
        try:
            cmd = [
                'rsvg-convert',
                '-w', str(size),
                '-h', str(size),
                svg_file,
                '-o', filename
            ]
            subprocess.run(cmd, check=True)
            print(f"✓ Generated {filename} ({size}x{size})")
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fallback to inkscape
            cmd = [
                'inkscape',
                svg_file,
                '--export-type=png',
                f'--export-filename={filename}',
                f'--export-width={size}',
                f'--export-height={size}'
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"✓ Generated {filename} ({size}x{size}) using Inkscape")
    except Exception as e:
        print(f"✗ Failed to generate {filename}: {e}")

print("\nIcon generation complete!")
print("Remember to rebuild the app with 'npm run build' to see the changes.")