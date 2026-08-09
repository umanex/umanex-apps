import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

/**
 * AI-crawlers worden expliciet toegelaten.
 *
 * Blokkeren kost naar schatting citaties in generatieve zoekmachines en beïnvloedt
 * de Google Search-ranking niet — het is dus verlies zonder opbrengst. Ze staan
 * apart genoemd in plaats van onder `*` te vallen, zodat later één crawler
 * ingetrokken kan worden zonder de rest te raken.
 *
 * Bytespider staat op disallow. Let op wat dat waard is: die crawler negeert
 * robots.txt in de praktijk regelmatig, dus dit is een intentieverklaring en geen
 * maatregel. Echt blokkeren gebeurt op WAF-niveau.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
