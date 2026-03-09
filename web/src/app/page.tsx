import { ArticleList } from '@/components/ArticleList';
import { getArticleSummaries } from '@/lib/articleVersions';

export default async function Home() {
  const articles = getArticleSummaries();

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
