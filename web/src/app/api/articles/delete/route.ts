import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, password } = body;

    if (!slug || !password) {
      return NextResponse.json({ error: 'Missing slug or password' }, { status: 400 });
    }

    // Read password from file
    const passwordPath = path.join(process.cwd(), 'password.json');
    if (!fs.existsSync(passwordPath)) {
        return NextResponse.json({ error: 'Server configuration error: password file missing' }, { status: 500 });
    }
    const passwordData = JSON.parse(fs.readFileSync(passwordPath, 'utf8'));

    if (password !== passwordData.password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Sanitize slug to prevent directory traversal
    // Allow standard slug characters
    const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, ''); 
    const articlesDirectory = path.join(process.cwd(), 'public/articles');
    const filePath = path.join(articlesDirectory, `${safeSlug}.md`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    // Also try to delete the assets folder if it exists
    const assetsPath = path.join(articlesDirectory, 'assets', safeSlug);
    if (fs.existsSync(assetsPath)) {
        fs.rmSync(assetsPath, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
