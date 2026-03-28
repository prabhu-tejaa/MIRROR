import os
import re

def clean_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove the schematic-inserted comment and overload
        # We use a broad regex that handles different line endings and whitespace
        new_content = re.sub(r'\s*/\*\*\s*Inserted by Angular inject.*?\*/\s*constructor\(\.\.\.args: unknown\[\]\);', '', content)
        
        # Remove empty constructor if it exists
        # This matches constructor() {} followed by an optional newline
        new_content = re.sub(r'\n\s*constructor\(\) \{\}\s*\n', '\n', new_content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Cleaned {filepath}")
    except Exception as e:
        print(f"Error cleaning {filepath}: {e}")

app_dir = r"c:\Users\91951\Desktop\Prabhu Teja\VIT\sem4\Project and Seminar\Project\MIRROR_PROJECT\MIRROR\frontend\src\app"
for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith(".ts"):
            clean_file(os.path.join(root, file))
