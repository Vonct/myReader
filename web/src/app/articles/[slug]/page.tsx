import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ARTICLE_VERSION_CONFIG,
  ArticleVersionKey,
  getArticleDocuments,
  getArticleVersionMeta,
  listArticleSlugs,
  normalizeArticleVersion,
} from '@/lib/articleVersions';

const basePath = '/myreader';

function resolveImageSrc(src?: string) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  if (src.startsWith('/articles/') && !src.startsWith(`${basePath}/`)) return `${basePath}${src}`;
  return src;
}

function getMarkdownImageSrc(src?: string | Blob) {
  return typeof src === 'string' ? resolveImageSrc(src) : '';
}

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    version?: string | string[];
  }>;
}

export async function generateStaticParams() {
  return listArticleSlugs().map((slug) => ({ slug }));
}

function formatArticleDate(date?: string) {
  if (!date) {
    return '';
  }

  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? '' : format(parsedDate, 'MMMM d, yyyy');
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedVersion = normalizeArticleVersion(resolvedSearchParams.version);
  const articleDocuments = getArticleDocuments(slug);
  const selectedArticle = articleDocuments[selectedVersion];
  const fallbackArticle = articleDocuments.digest ?? articleDocuments.translation;

  if (!fallbackArticle) {
    notFound();
  }

  const { frontmatter } = fallbackArticle;
  const versionOrder = Object.keys(ARTICLE_VERSION_CONFIG) as ArticleVersionKey[];
  const selectedVersionMeta = getArticleVersionMeta(selectedVersion);

  return (
    <article className="prose prose-lg prose-slate mx-auto prose-headings:font-serif prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-4 prose-a:text-[#d94c1a] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">
      <header className="mb-12 not-prose border-b border-[#e5e5e5] pb-8 text-center">
        <div className="flex justify-center items-center space-x-2 text-sm text-[#6b6b6b] mb-4 uppercase tracking-wider font-medium">
          <time dateTime={frontmatter.date}>
            {formatArticleDate(frontmatter.date as string | undefined)}
          </time>
          <span>•</span>
          <span>{frontmatter.category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a1a1a] mb-6 leading-tight">
          {frontmatter.title}
        </h1>
        <div className="flex justify-center gap-3 flex-wrap mb-6">
          {versionOrder.map((version) => {
            const versionMeta = getArticleVersionMeta(version);
            const isActive = version === selectedVersion;
            const isAvailable = Boolean(articleDocuments[version]);
            const href = version === 'digest' ? `/articles/${slug}` : `/articles/${slug}?version=${version}`;

            return (
              <Link
                key={version}
                href={href}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                    : 'border-[#d8d8d8] bg-white text-[#4a4a4a] hover:border-[#1a1a1a] hover:text-[#1a1a1a]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {versionMeta.label}
                {!isAvailable && <span className="ml-2 text-xs opacity-70">未提供</span>}
              </Link>
            );
          })}
        </div>
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
        {selectedArticle ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                <img src={getMarkdownImageSrc(src)} alt={alt ?? ''} className="rounded-xl w-full h-auto" loading="lazy" />
              ),
            }}
          >
            {selectedArticle.content}
          </ReactMarkdown>
        ) : (
          <div className="not-prose rounded-2xl border border-dashed border-[#d8d8d8] bg-[#faf8f4] px-8 py-12 text-center">
            <p className="text-xl font-serif text-[#1a1a1a] mb-3">{selectedVersionMeta.emptyMessage}</p>
            <p className="text-sm text-[#6b6b6b] leading-7 max-w-xl mx-auto">
              当前页面仅收录了其他版本内容；后续补齐后，这个标签页会直接展示对应版本。
            </p>
          </div>
        )}
      </div>

      <div className="mt-16 pt-8 border-t border-[#e5e5e5]">
        <Link href="/" className="text-[#6b6b6b] hover:text-[#1a1a1a] font-medium transition-colors">
          &larr; Back to all articles
        </Link>
      </div>
    </article>
  );
}
