import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { format } from 'date-fns';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getArticle(slug: string) {
  const articlesDirectory = path.join(process.cwd(), 'public/articles');
  const filePath = path.join(articlesDirectory, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    frontmatter: data,
    content,
  };
}

export async function generateStaticParams() {
  const articlesDirectory = path.join(process.cwd(), 'public/articles');
  if (!fs.existsSync(articlesDirectory)) return [];
  
  const filenames = fs.readdirSync(articlesDirectory);

  return filenames
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => ({
      slug: filename.replace(/\.md$/, ''),
    }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const { frontmatter, content } = article;

  return (
    <article className="prose prose-lg prose-slate mx-auto prose-headings:font-serif prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-4 prose-a:text-[#d94c1a] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">
      <header className="mb-12 not-prose border-b border-[#e5e5e5] pb-8 text-center">
        <div className="flex justify-center items-center space-x-2 text-sm text-[#6b6b6b] mb-4 uppercase tracking-wider font-medium">
          <time dateTime={frontmatter.date}>
            {frontmatter.date ? format(new Date(frontmatter.date), 'MMMM d, yyyy') : ''}
          </time>
          <span>•</span>
          <span>{frontmatter.category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a1a1a] mb-6 leading-tight">
          {frontmatter.title}
        </h1>
        {frontmatter.summary && (
          <p className="text-xl text-[#4a4a4a] font-serif italic max-w-2xl mx-auto leading-relaxed">
            {frontmatter.summary}
          </p>
        )}
        {frontmatter.tags && (
          <div className="flex justify-center gap-2 mt-6">
            {frontmatter.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-[#f4f1ea] rounded-full text-xs font-mono text-[#555]">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {frontmatter.url && (
          <div className="mt-8">
            <a 
              href={frontmatter.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-[#d94c1a] hover:text-[#b93c10] transition-colors"
            >
              Read Original Source &rarr;
            </a>
          </div>
        )}
      </header>

      <div className="font-serif text-[#2a2a2a] leading-loose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>

      <div className="mt-16 pt-8 border-t border-[#e5e5e5]">
        <Link href="/" className="text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors">
          &larr; Back to all articles
        </Link>
      </div>
    </article>
  );
}
