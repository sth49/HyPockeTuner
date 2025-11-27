#!/usr/bin/env python3
"""
Generate iOS-specific icon sizes for HyPockeTuner
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    # Ensure we're in the right directory
    os.chdir('/home/donghee/HyPockeTuner_new/client/public')
    
    # iOS specific icon sizes
    ios_sizes = [
        (57, 'icon-57.png'),
        (60, 'icon-60.png'),
        (76, 'icon-76.png'),
        (114, 'icon-114.png'),
        (120, 'icon-120.png'),
        (152, 'icon-152.png'),
    ]
    
    for size, filename in ios_sizes:
        # Create a new image with blue background
        img = Image.new('RGBA', (size, size), (30, 64, 175, 255))  # #1e40af
        draw = ImageDraw.Draw(img)
        
        # Draw white circle background
        margin = int(size * 0.06)
        draw.ellipse([margin, margin, size-margin, size-margin], fill=(30, 64, 175, 255))
        
        # Draw HPT text (scaled based on size)
        text = "HPT"
        font_size = int(size * 0.23)
        
        # Try to use a basic font
        try:
            from PIL import ImageFont
            # Try to load a truetype font, fallback to default if not available
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except:
                    # Use default font as last resort
                    font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Get text bounding box for centering
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2 - int(size * 0.1)  # Slightly above center
        
        # Draw text
        draw.text((text_x, text_y), text, fill='white', font=font)
        
        # Draw optimization curve (simplified)
        curve_y = int(size * 0.65)
        curve_start_x = int(size * 0.15)
        curve_end_x = int(size * 0.85)
        
        # Simple line to represent optimization
        points = [
            (curve_start_x, curve_y),
            (int(size * 0.35), int(size * 0.62)),
            (int(size * 0.55), int(size * 0.58)),
            (int(size * 0.75), int(size * 0.54)),
            (curve_end_x, int(size * 0.50))
        ]
        
        # Draw the optimization line
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill='white', width=max(1, int(size * 0.012)))
        
        # Draw optimization points
        for i, point in enumerate(points[1:], 1):
            radius = max(1, int(size * 0.016)) if i < len(points) - 1 else max(2, int(size * 0.02))
            color = (96, 165, 250, 255) if i < len(points) - 1 else (52, 211, 153, 255)
            x, y = point
            draw.ellipse([x-radius, y-radius, x+radius, y+radius], fill=color)
        
        # Save the image
        img.save(filename, 'PNG')
        print(f"✓ Generated {filename} ({size}x{size})")
    
    print("\niOS icon generation complete!")
    
except ImportError as e:
    print(f"Error: Missing required library. Please install Pillow: pip install Pillow")
    print(f"Details: {e}")
except Exception as e:
    print(f"Error generating icons: {e}")