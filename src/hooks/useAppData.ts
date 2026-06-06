import { useState, useEffect, useCallback } from 'react';
import { getArticles, getCategories, getLiens } from '../services/articleService';
import { getBulletins } from '../services/bulletinService';
import { fetchSubscribers, fetchNewsletters } from '../services/newsletterService';
import { Article, Bulletin, LienRessource, Subscriber, Newsletter } from '../types';
import { useAuth } from './useAuth';

export const useAppData = () => {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [categories, setCategories] = useState<{ id: string, nom: string, ordre: number }[]>([]);
  const [liens, setLiens] = useState<LienRessource[]>([]);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);

  const loadPublicData = useCallback(async () => {
    setLoading(true);
    try {
      const [art, bull, cat, lnk] = await Promise.all([
        getArticles(),
        getBulletins(),
        getCategories(),
        getLiens()
      ]);
      setArticles(art);
      setBulletins(bull);
      setCategories(cat);
      setLiens(lnk);
    } catch (error) {
      console.error("Failed to load public data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const [subs, news] = await Promise.all([
        fetchSubscribers(),
        fetchNewsletters()
      ]);
      setSubscribers(subs);
      setNewsletters(news);
    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  return {
    articles,
    bulletins,
    categories,
    liens,
    subscribers,
    newsletters,
    loading,
    adminLoading,
    loadAdminData,
    refreshPublicData: loadPublicData
  };
};
