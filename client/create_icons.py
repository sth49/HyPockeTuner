from PIL import Image, ImageDraw, ImageFont
import os

def create_app_icon(size, filename):
    # Create a new image with blue background
    img = Image.new('RGB', (size, size), color='#3B82F6')
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions based on size
    center = size // 2
    radius = int(size * 0.3)  # 30% of size
    
    # Draw main circle (pocket watch)
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                 fill='#F8FAFC', outline='#1E293B', width=max(1, size//64))
    
    # Draw clock hands
    hand_width = max(1, size//64)
    # Hour hand (shorter, pointing up)
    draw.line([center, center, center, center - radius//2], fill='#DC2626', width=hand_width)
    # Minute hand (longer, pointing right)
    draw.line([center, center, center + radius//1.5, center], fill='#1E293B', width=hand_width)
    
    # Center dot
    dot_radius = max(2, size//42)
    draw.ellipse([center - dot_radius, center - dot_radius, center + dot_radius, center + dot_radius], 
                 fill='#1E293B')
    
    # Hour markers
    marker_radius = max(1, size//64)
    positions = [
        (center, center - radius + marker_radius*2),  # 12
        (center + radius - marker_radius*2, center),  # 3
        (center, center + radius - marker_radius*2),  # 6
        (center - radius + marker_radius*2, center),  # 9
    ]
    
    for x, y in positions:
        draw.ellipse([x - marker_radius, y - marker_radius, x + marker_radius, y + marker_radius], 
                     fill='#1E293B')
    
    # Performance curve
    if size >= 64:  # Only draw for larger icons
        curve_y = center + radius//3
        curve_points = [
            (center - radius//2, curve_y),
            (center - radius//4, curve_y - radius//6),
            (center, curve_y - radius//8),
            (center + radius//4, curve_y - radius//6),
            (center + radius//2, curve_y)
        ]
        
        # Draw curve segments
        for i in range(len(curve_points) - 1):
            draw.line([curve_points[i], curve_points[i+1]], fill='#10B981', width=max(1, size//128))
        
        # Draw data points
        for x, y in curve_points:
            point_radius = max(1, size//128)
            draw.ellipse([x - point_radius, y - point_radius, x + point_radius, y + point_radius], 
                         fill='#10B981')
    
    # Draw "HP" text for larger icons
    if size >= 64:
        try:
            font_size = max(12, size//12)
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except:
                    font = ImageFont.load_default()
            
            text = "HP"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            text_x = center - text_width // 2
            text_y = center + radius + (size - center - radius) // 2 - text_height // 2
            
            draw.text((text_x, text_y), text, fill='#F8FAFC', font=font)
        except:
            pass  # Skip text if font loading fails
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

def main():
    # Create public directory if it doesn't exist
    public_dir = "public"
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
    
    # Generate icons in different sizes
    sizes_and_names = [
        (192, "public/icon-192.png"),
        (512, "public/icon-512.png"),
        (180, "public/apple-touch-icon.png"),
        (32, "public/favicon-32x32.png"),
        (16, "public/favicon-16x16.png"),
        (256, "public/icon-256.png"),
        (144, "public/icon-144.png"),
        (72, "public/icon-72.png"),
        (48, "public/icon-48.png")
    ]
    
    for size, filename in sizes_and_names:
        create_app_icon(size, filename)
    
    print("\nAll icons created successfully!")
    print("Icons created:")
    for _, filename in sizes_and_names:
        print(f"  - {filename}")

if __name__ == "__main__":
    main()