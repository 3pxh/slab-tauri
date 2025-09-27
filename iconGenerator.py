"""
https://gist.github.com/Auax/e2e6c4edbbe2d41b3797940c567ec352
Generate icons for a Tauri Application
----------------------
By Ibai Farina
For correct functionality, the base logo should be 512x512 or larger (keeping the aspect ratio).
"""

__title__ = 'Tauri Icon Generator'
__author__ = 'Ibai Farina'
__license__ = 'MIT'
__version__ = '0.1.0'

import os
import sys

os.system("cls" if os.name == "nt" else "clear")

try:
    from PIL import Image
    import icnsutil

except ImportError:
    print("Error while importing the required libraries to run this app.")
    print("Make sure you have installed:")
    print("- PIL (https://pypi.org/project/Pillow/) : manipulate images")
    print("- icnsutil (https://pypi.org/project/icnsutil/) : create the .icns macOS icon file")

icon_guides = {
    "32x32": 32,
    "128x128": 128,
    "128x128@2x": 256,
    "icon": 512,
    "Square30x30Logo": 30,
    "Square44x44Logo": 44,
    "Square71x71Logo": 71,
    "Square89x89Logo": 89,
    "Square107x107Logo": 107,
    "Square142x142Logo": 142,
    "Square150x150Logo": 150,
    "Square284x284Logo": 284,
    "Square310x310Logo": 312,
    "StoreLogo": 50,
}

# Apple AppIcon assets for iOS
apple_icon_guides = {
    # iPhone icons
    "AppIcon-20x20@2x": 40,      # 20x20 @2x = 40x40
    "AppIcon-20x20@3x": 60,      # 20x20 @3x = 60x60
    "AppIcon-29x29@2x-1": 58,    # 29x29 @2x = 58x58
    "AppIcon-29x29@3x": 87,      # 29x29 @3x = 87x87
    "AppIcon-40x40@2x": 80,      # 40x40 @2x = 80x80
    "AppIcon-40x40@3x": 120,     # 40x40 @3x = 120x120
    "AppIcon-60x60@2x": 120,     # 60x60 @2x = 120x120
    "AppIcon-60x60@3x": 180,     # 60x60 @3x = 180x180
    
    # iPad icons
    "AppIcon-20x20@1x": 20,      # 20x20 @1x = 20x20
    "AppIcon-20x20@2x-1": 40,    # 20x20 @2x = 40x40
    "AppIcon-29x29@1x": 29,      # 29x29 @1x = 29x29
    "AppIcon-29x29@2x": 58,      # 29x29 @2x = 58x58
    "AppIcon-40x40@1x": 40,      # 40x40 @1x = 40x40
    "AppIcon-40x40@2x-1": 80,    # 40x40 @2x = 80x80
    "AppIcon-76x76@1x": 76,      # 76x76 @1x = 76x76
    "AppIcon-76x76@2x": 152,     # 76x76 @2x = 152x152
    "AppIcon-83.5x83.5@2x": 167, # 83.5x83.5 @2x = 167x167
    
    # iOS Marketing (App Store)
    "AppIcon-512@2x": 1024,      # 1024x1024 for App Store
}

base_image_path = 'public/icon.png'
tauri_icons_path = 'src-tauri/icons'
apple_icons_path = 'src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset'

try:
    base_image = Image.open(base_image_path)  # 1024x1024 base icon
    
except FileNotFoundError:
    print("Specified filed doesn't exist!")
    sys.exit(-1)

if not os.path.exists(tauri_icons_path):
    print("Creating `icons` folder")
    os.mkdir(tauri_icons_path)

# Create Apple icons directory if it doesn't exist
if not os.path.exists(apple_icons_path):
    print("Creating Apple AppIcon directory")
    os.makedirs(apple_icons_path, exist_ok=True)

# All png icons
for filename, size in icon_guides.items():
    resized = base_image.resize((size, size)).convert("RGBA")
    resized.save(os.path.join(tauri_icons_path, filename + ".png"))

# Apple AppIcon assets
print("Generating Apple AppIcon assets...")
for filename, size in apple_icon_guides.items():
    resized = base_image.resize((size, size)).convert("RGBA")
    resized.save(os.path.join(apple_icons_path, filename + ".png"))
    print(f"Generated: {filename}.png ({size}x{size})")


# .ico file
sizes = [(128, 128)]
base_image.save(os.path.join(tauri_icons_path, "icon.ico"), sizes=sizes)


# macOS icns icons
icns = icnsutil.IcnsFile()
icns.add_media(file=base_image_path)
icns.add_media(file=os.path.join(tauri_icons_path, "128x128@2x.png"))
icns.write(os.path.join(tauri_icons_path, "icon.icns"))


print("Done!")