import os
import re
import requests
import argparse
from urllib.parse import urljoin, urlparse
from pathlib import Path

def download_image(url, save_dir):
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        # Extract filename from URL or use a default
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            content_type = response.headers.get('content-type')
            ext = '.jpg'
            if content_type:
                if 'png' in content_type: ext = '.png'
                elif 'gif' in content_type: ext = '.gif'
                elif 'svg' in content_type: ext = '.svg'
                elif 'webp' in content_type: ext = '.webp'
            filename = f"image_{hash(url)}{ext}"
            
        # Sanitize filename
        filename = re.sub(r'[^\w\-.]', '_', filename)
        
        save_path = os.path.join(save_dir, filename)
        
        with open(save_path, 'wb') as out_file:
            for chunk in response.iter_content(1024):
                out_file.write(chunk)
                
        return filename
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def process_markdown(file_path, source_url):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find slug from file path (assuming format YYYY-MM-DD-slug.md)
    filename = os.path.basename(file_path)
    slug_match = re.match(r'\d{4}-\d{2}-\d{2}-(.+)\.md', filename)
    slug = slug_match.group(1) if slug_match else filename.replace('.md', '')
    
    # Setup assets directory
    # Assume file_path is in web/public/articles/
    # Assets should go to web/public/articles/assets/{slug}/
    
    # We need to find the project root relative to the markdown file
    # If the file is in e:\...\web\public\articles\file.md
    # Then assets dir is e:\...\web\public\articles\assets\{slug}\
    
    articles_dir = os.path.dirname(file_path)
    assets_base_dir = os.path.join(articles_dir, 'assets')
    article_assets_dir = os.path.join(assets_base_dir, slug)
    
    if not os.path.exists(article_assets_dir):
        os.makedirs(article_assets_dir, exist_ok=True)
        
    # Find all image links: ![alt](url)
    # Also handle html <img> tags if possible, but markdown regex is safer for now
    
    def replace_image(match):
        alt_text = match.group(1)
        img_url = match.group(2)
        
        # Resolve relative URLs
        absolute_url = urljoin(source_url, img_url)
        
        print(f"Found image: {absolute_url}")
        
        filename = download_image(absolute_url, article_assets_dir)
        
        if filename:
            # Return new relative path for Next.js
            # Next.js public folder structure:
            # /articles/assets/slug/filename
            new_path = f"/articles/assets/{slug}/{filename}"
            return f"![{alt_text}]({new_path})"
        else:
            return match.group(0) # Keep original if download fails

    # Regex for standard markdown images
    new_content = re.sub(r'!\[(.*?)\]\((.*?)\)', replace_image, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Processed images for {file_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download images from markdown file")
    parser.add_argument("file_path", help="Path to the markdown file")
    parser.add_argument("source_url", help="Source URL of the article to resolve relative links")
    
    args = parser.parse_args()
    
    process_markdown(args.file_path, args.source_url)
