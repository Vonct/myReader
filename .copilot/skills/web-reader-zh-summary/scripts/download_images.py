import os
import re
import base64
import html
import requests
import argparse
from urllib.parse import urljoin, urlparse

def sanitize_filename(name):
    return re.sub(r'[^\w\-.]', '_', name)

def infer_ext_from_content_type(content_type):
    if not content_type:
        return '.jpg'
    ct = content_type.lower()
    if 'png' in ct:
        return '.png'
    if 'gif' in ct:
        return '.gif'
    if 'svg' in ct:
        return '.svg'
    if 'webp' in ct:
        return '.webp'
    if 'jpeg' in ct or 'jpg' in ct:
        return '.jpg'
    return '.jpg'

def save_bytes(save_dir, filename, data):
    filename = sanitize_filename(filename)
    save_path = os.path.join(save_dir, filename)
    with open(save_path, 'wb') as out_file:
        out_file.write(data)
    return filename

def download_http_image(url, save_dir, fallback_basename='image'):
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()

        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            ext = infer_ext_from_content_type(response.headers.get('content-type'))
            filename = f"{fallback_basename}_{hash(url)}{ext}"
        filename = sanitize_filename(filename)
        save_path = os.path.join(save_dir, filename)
        with open(save_path, 'wb') as out_file:
            for chunk in response.iter_content(1024):
                out_file.write(chunk)
        return filename
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def download_data_uri(img_url, save_dir, fallback_basename='image'):
    try:
        m = re.match(r'^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$', img_url, flags=re.DOTALL)
        if not m:
            return None
        mime_subtype = m.group(1).lower()
        b64 = m.group(2).strip()
        ext_map = {
            'jpeg': 'jpg',
            'jpg': 'jpg',
            'png': 'png',
            'gif': 'gif',
            'svg+xml': 'svg',
            'webp': 'webp'
        }
        ext = ext_map.get(mime_subtype, 'jpg')
        data = base64.b64decode(b64)
        filename = f"{fallback_basename}_{hash(img_url)}.{ext}"
        return save_bytes(save_dir, filename, data)
    except Exception as e:
        print(f"Error decoding data URI image: {e}")
        return None

def extract_attr(tag_html, attr_name):
    p = re.compile(rf'{attr_name}\s*=\s*([\'"])(.*?)\1', flags=re.IGNORECASE | re.DOTALL)
    m = p.search(tag_html)
    if not m:
        return ''
    return html.unescape(m.group(2).strip())

def extract_images_from_source(source_url, max_images=8):
    try:
        response = requests.get(source_url, timeout=20)
        response.raise_for_status()
        html_text = response.text
    except Exception as e:
        print(f"Error fetching source page for image discovery: {e}")
        return []

    images = []
    seen = set()
    for m in re.finditer(r'<img\b[^>]*>', html_text, flags=re.IGNORECASE | re.DOTALL):
        tag = m.group(0)
        src = extract_attr(tag, 'src')
        if not src:
            continue
        src = src.strip()
        if src.startswith('javascript:') or src.startswith('blob:'):
            continue
        if src in seen:
            continue
        seen.add(src)
        alt = extract_attr(tag, 'alt')
        images.append((alt, src))
        if len(images) >= max_images:
            break
    return images

def is_candidate_image(src, alt=''):
    text = f"{src} {alt}".lower()
    blocked = ['logo', 'icon', 'avatar', 'sprite', 'favicon', 'badge', 'pixel', '1x1', 'blank']
    return not any(k in text for k in blocked)

def insert_images_near_sections(content, image_markdowns):
    if not image_markdowns:
        return content
    lines = content.splitlines()
    heading_positions = []
    for idx, line in enumerate(lines):
        if re.match(r'^\s{0,3}#{2,4}\s+', line):
            heading_positions.append(idx)
    if heading_positions:
        targets = []
        total_headings = len(heading_positions)
        total_images = len(image_markdowns)
        for i in range(total_images):
            mapped = int((i * total_headings) / total_images)
            if mapped >= total_headings:
                mapped = total_headings - 1
            targets.append(heading_positions[mapped] + 1)
    else:
        targets = [len(lines)] * len(image_markdowns)
    for idx, md in sorted(zip(targets, image_markdowns), key=lambda x: x[0], reverse=True):
        if idx >= len(lines):
            lines.extend(['', md, ''])
        else:
            lines[idx:idx] = ['', md, '']
    return '\n'.join(lines)

def download_image_source(img_url, source_url, save_dir, fallback_basename='image'):
    if img_url.startswith('/articles/assets/'):
        return None
    if img_url.startswith('data:image/'):
        return download_data_uri(img_url, save_dir, fallback_basename)
    absolute_url = urljoin(source_url, img_url)
    return download_http_image(absolute_url, save_dir, fallback_basename)

def process_markdown(file_path, source_url):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(file_path)
    slug_match = re.match(r'\d{4}-\d{2}-\d{2}-(.+)\.md', filename)
    slug = slug_match.group(1) if slug_match else filename.replace('.md', '')

    articles_dir = os.path.dirname(file_path)
    assets_base_dir = os.path.join(articles_dir, 'assets')
    article_assets_dir = os.path.join(assets_base_dir, slug)

    if not os.path.exists(article_assets_dir):
        os.makedirs(article_assets_dir, exist_ok=True)

    download_count = 0

    def replace_image(match):
        nonlocal download_count
        alt_text = match.group(1)
        img_url = match.group(2)
        filename = download_image_source(img_url, source_url, article_assets_dir, f"{slug}-md")
        if filename:
            download_count += 1
            new_path = f"/articles/assets/{slug}/{filename}"
            return f"![{alt_text}]({new_path})"
        return match.group(0)

    new_content = re.sub(r'!\[(.*?)\]\((.*?)\)', replace_image, content)

    has_markdown_images = bool(re.search(r'!\[(.*?)\]\((.*?)\)', new_content))
    if not has_markdown_images and '/articles/assets/' not in new_content:
        discovered = extract_images_from_source(source_url, max_images=8)
        discovered_lines = []
        for idx, (alt, src) in enumerate(discovered, start=1):
            if not is_candidate_image(src, alt):
                continue
            saved = download_image_source(src, source_url, article_assets_dir, f"{slug}-src-{idx:02d}")
            if saved:
                download_count += 1
                alt_text = alt if alt else f"原文配图 {idx}"
                discovered_lines.append(f"![{alt_text}](/articles/assets/{slug}/{saved})")
        if discovered_lines:
            new_content = insert_images_near_sections(new_content, discovered_lines)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Processed images for {file_path}; downloaded={download_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download images from markdown file")
    parser.add_argument("file_path", help="Path to the markdown file")
    parser.add_argument("source_url", help="Source URL of the article to resolve relative links")
    
    args = parser.parse_args()
    
    process_markdown(args.file_path, args.source_url)
