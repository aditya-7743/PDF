import os
from PIL import Image, ImageDraw

def create_app_icon(output_path="app_icon.ico"):
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rect - vibrant royal blue
    bg_color = (24, 119, 242)
    draw.rounded_rectangle([16, 16, 240, 240], radius=48, fill=bg_color)

    # Inner subtle top highlight
    draw.rounded_rectangle([20, 20, 236, 120], radius=42, fill=(45, 140, 255))

    # Inner white photo card
    draw.rounded_rectangle([52, 60, 204, 196], radius=24, fill=(255, 255, 255))

    # Photo landscape sun & mountain
    # Sun
    draw.ellipse([74, 82, 102, 110], fill=(255, 179, 0))
    # Mountain 1
    draw.polygon([(64, 180), (110, 120), (146, 180)], fill=(74, 144, 226))
    # Mountain 2
    draw.polygon([(118, 180), (154, 136), (192, 180)], fill=(41, 105, 196))

    # Red PDF Badge in top-right
    draw.rounded_rectangle([140, 28, 232, 76], radius=14, fill=(225, 45, 57))
    # Text "PDF"
    # P
    draw.rectangle([156, 40, 160, 64], fill=(255, 255, 255))
    draw.rectangle([160, 40, 170, 44], fill=(255, 255, 255))
    draw.rectangle([166, 44, 170, 52], fill=(255, 255, 255))
    draw.rectangle([160, 48, 170, 52], fill=(255, 255, 255))
    # D
    draw.rectangle([176, 40, 180, 64], fill=(255, 255, 255))
    draw.rectangle([180, 40, 188, 44], fill=(255, 255, 255))
    draw.rectangle([180, 60, 188, 64], fill=(255, 255, 255))
    draw.rectangle([186, 44, 190, 60], fill=(255, 255, 255))
    # F
    draw.rectangle([196, 40, 200, 64], fill=(255, 255, 255))
    draw.rectangle([200, 40, 210, 44], fill=(255, 255, 255))
    draw.rectangle([200, 50, 208, 54], fill=(255, 255, 255))

    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(output_path, format="ICO", sizes=icon_sizes)
    print(f"Generated {output_path} successfully!")

if __name__ == "__main__":
    create_app_icon()
