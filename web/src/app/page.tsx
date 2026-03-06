import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ArticleList, Article } from '@/components/ArticleList';

async function getArticles(): Promise<Article[]> {
  const articlesDirectory = path.join(process.cwd(), 'public/articles');
  
  if (!fs.existsSync(articlesDirectory)) {
    fs.mkdirSync(articlesDirectory, { recursive: true });
    return [];
  }

  const filenames = fs.readdirSync(articlesDirectory);

  const articles = filenames
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => {
      const filePath = path.join(articlesDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      
      // Calculate reading time (approx 200 words per minute)
      const words = content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(words / 200);
      
      return {
        slug: filename.replace(/\.md$/, ''),
        title: data.title || filename,
        date: data.date || '',
        category: data.category || 'Uncategorized',
        summary: data.summary || '',
        tags: data.tags || [],
        readingTime,
      };
    })
    // Sort by date descending
    .sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));

  return articles;
}

export default async function Home() {
  const articles = await getArticles();

  return (
    <div className="space-y-24">
      <div className="space-y-6 pt-12 animate-apple-fade-in">
        <h1 className="text-apple-display font-serif tracking-tight text-foreground">
          Insights & <br/>
          <span className="text-muted-foreground">Translations</span>
        </h1>
        <p className="text-apple-title text-muted-foreground max-w-lg leading-relaxed font-sans font-normal">
          Curated readings on technology and culture, translated and summarized for clarity.
        </p>
      </div>

      <ArticleList articles={articles} />
    </div>
  );
}
