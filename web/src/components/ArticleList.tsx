'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Trash2, Clock, Calendar, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Article {
  slug: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  tags?: string[];
  readingTime?: number;
}

interface ArticleListProps {
  articles: Article[];
}

export function ArticleList({ articles: initialArticles }: ArticleListProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [password, setPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Group by Year
  const groupedArticles = articles.reduce((acc, article) => {
    const year = new Date(article.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(article);
    return acc;
  }, {} as Record<number, Article[]>);

  // Sort years descending
  const years = Object.keys(groupedArticles).map(Number).sort((a, b) => b - a);

  const handleDeleteClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setArticleToDelete(slug);
    setShowDeleteDialog(true);
    setPassword('');
    setErrorMsg('');
  };

  const confirmDelete = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/articles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: articleToDelete, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setArticles((prev) => prev.filter((a) => a.slug !== articleToDelete));
        setShowDeleteDialog(false);
        setArticleToDelete(null);
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Failed to delete');
      }
    } catch (error) {
      setErrorMsg('Network error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50, damping: 20 } }
  };

  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground font-serif italic text-lg">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-20">
      {years.map((year) => (
        <section key={year} className="relative">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-baseline gap-4 mb-8 border-b border-border/60 pb-4"
          >
             <h2 className="text-apple-display text-muted-foreground/20 font-bold tracking-tighter select-none">{year}</h2>
          </motion.div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode='popLayout'>
            {groupedArticles[year].map((article) => (
              <motion.article 
                layout
                key={article.slug}
                variants={item}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >
                <div className="glass rounded-xl overflow-hidden h-full border border-border/50 transition-all duration-300 hover:shadow-lg flex flex-col">
                  <Link href={`/articles/${article.slug}`} className="flex-1 p-8 block h-full flex flex-col">
                    {/* Meta Header */}
                    <div className="flex items-center justify-between text-apple-caption mb-4 uppercase tracking-widest">
                      <span className="text-accent font-bold">
                        {article.category}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <time dateTime={article.date} className="tabular-nums">
                          {format(new Date(article.date), 'MMM d')}
                        </time>
                        {article.readingTime && (
                           <span className="text-muted-foreground/60">
                             {article.readingTime} min
                           </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-apple-title text-foreground mb-3 leading-snug group-hover:text-accent transition-colors pr-6">
                      {article.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-apple-body text-muted-foreground line-clamp-3 mb-6 flex-1">
                      {article.summary}
                    </p>

                    {/* Footer / Tags */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex flex-wrap gap-2">
                        {article.tags && article.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full uppercase tracking-wide">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <ArrowUpRight size={16} className="text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                    </div>
                  </Link>

                  {/* Delete Action */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleDeleteClick(e, article.slug)}
                    className="absolute top-4 right-4 p-2 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-20"
                    aria-label="Delete article"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.article>
            ))}
            </AnimatePresence>
          </motion.div>
        </section>
      ))}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
      {showDeleteDialog && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="glass rounded-xl p-8 w-full max-w-sm shadow-2xl border border-white/20"
          >
            <h3 className="text-apple-title text-foreground mb-2">Confirm Deletion</h3>
            <p className="text-apple-body text-muted-foreground mb-6 text-sm">
              This action cannot be undone. Enter the admin password to confirm.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-muted border border-transparent focus:border-accent/20 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:ring-2 focus:ring-accent/10 outline-none transition-all font-mono text-sm"
                  placeholder="Password"
                  autoFocus
                />
                {errorMsg && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-1 text-red-500 text-xs font-medium"
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2.5 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting || !password}
                  className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg transition-all"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
