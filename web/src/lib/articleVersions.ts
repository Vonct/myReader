import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const ARTICLE_VERSION_CONFIG = {
  digest: {
    key: 'digest',
    label: '精读版',
    directory: 'articles_digest',
    emptyMessage: '该文章暂未提供精读版。',
  },
  translation: {
    key: 'translation',
    label: '翻译版',
    directory: 'articles_translation',
    emptyMessage: '该文章暂未提供翻译版。',
  },
} as const;

const LEGACY_DIGEST_DIRECTORY = 'articles';

export type ArticleVersionKey = keyof typeof ARTICLE_VERSION_CONFIG;

export interface ArticleFrontmatter {
  title?: string;
  date?: string;
  category?: string;
  summary?: string;
  tags?: string[];
  url?: string;
  original_title?: string;
  [key: string]: unknown;
}

export interface ArticleDocument {
  slug: string;
  version: ArticleVersionKey;
  frontmatter: ArticleFrontmatter;
  content: string;
  filePath: string;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  tags: string[];
  readingTime: number;
  availableVersions: ArticleVersionKey[];
}

function getPublicDirectory(directory: string) {
  return path.join(process.cwd(), 'public', directory);
}

function getVersionDirectories(version: ArticleVersionKey) {
  const directories = [getPublicDirectory(ARTICLE_VERSION_CONFIG[version].directory)];

  if (version === 'digest') {
    directories.push(getPublicDirectory(LEGACY_DIGEST_DIRECTORY));
  }

  return directories;
}

function listMarkdownSlugsInDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => filename.replace(/\.md$/, ''));
}

function readMarkdownFile(filePath: string, version: ArticleVersionKey): ArticleDocument {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: path.basename(filePath, '.md'),
    version,
    frontmatter: data as ArticleFrontmatter,
    content,
    filePath,
  };
}

export function normalizeArticleVersion(value?: string | string[]): ArticleVersionKey {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return normalizedValue === 'translation' ? 'translation' : 'digest';
}

export function getArticleVersionMeta(version: ArticleVersionKey) {
  return ARTICLE_VERSION_CONFIG[version];
}

export function readArticle(slug: string, version: ArticleVersionKey): ArticleDocument | null {
  for (const directory of getVersionDirectories(version)) {
    const filePath = path.join(directory, `${slug}.md`);

    if (fs.existsSync(filePath)) {
      return readMarkdownFile(filePath, version);
    }
  }

  return null;
}

export function getArticleDocuments(slug: string) {
  return {
    digest: readArticle(slug, 'digest'),
    translation: readArticle(slug, 'translation'),
  };
}

export function getAvailableArticleVersions(slug: string): ArticleVersionKey[] {
  return (Object.keys(ARTICLE_VERSION_CONFIG) as ArticleVersionKey[]).filter((version) => Boolean(readArticle(slug, version)));
}

export function listArticleSlugs() {
  const slugs = new Set<string>();

  (Object.keys(ARTICLE_VERSION_CONFIG) as ArticleVersionKey[]).forEach((version) => {
    getVersionDirectories(version).forEach((directory) => {
      listMarkdownSlugsInDirectory(directory).forEach((slug) => slugs.add(slug));
    });
  });

  return Array.from(slugs);
}

function getReadingTime(content: string) {
  const trimmed = content.trim();

  if (!trimmed) {
    return 1;
  }

  const words = trimmed.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getSortableDate(date?: string) {
  if (!date) {
    return 0;
  }

  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getArticleSummaries(): ArticleSummary[] {
  return listArticleSlugs()
    .map((slug) => {
      const articleDocuments = getArticleDocuments(slug);
      const preferredArticle = articleDocuments.digest ?? articleDocuments.translation;

      if (!preferredArticle) {
        return null;
      }

      return {
        slug,
        title: preferredArticle.frontmatter.title || slug,
        date: preferredArticle.frontmatter.date || '',
        category: preferredArticle.frontmatter.category || 'Uncategorized',
        summary: preferredArticle.frontmatter.summary || '',
        tags: preferredArticle.frontmatter.tags || [],
        readingTime: getReadingTime(preferredArticle.content),
        availableVersions: (Object.keys(ARTICLE_VERSION_CONFIG) as ArticleVersionKey[]).filter(
          (version) => Boolean(articleDocuments[version])
        ),
      };
    })
    .filter((article): article is ArticleSummary => article !== null)
    .sort((first, second) => getSortableDate(second.date) - getSortableDate(first.date));
}

export function getAllStoredArticlePaths(slug: string) {
  const paths = new Set<string>();

  (Object.keys(ARTICLE_VERSION_CONFIG) as ArticleVersionKey[]).forEach((version) => {
    getVersionDirectories(version).forEach((directory) => {
      paths.add(path.join(directory, `${slug}.md`));
    });
  });

  return Array.from(paths);
}
