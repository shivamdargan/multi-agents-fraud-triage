import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    const results = await this.prisma.knowledgeBase.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
      take: 10,
    });

    return {
      query,
      results: results.map((r: any) => ({
        title: r.title,
        anchor: r.anchor,
        snippet: this.extractSnippet(r.content, query),
        relevance: this.calculateRelevance(r, query),
      })),
    };
  }

  async lookup(anchor: string) {
    const entry = await this.prisma.knowledgeBase.findUnique({
      where: { anchor },
    });

    if (!entry) {
      return { found: false };
    }

    return {
      found: true,
      entry: {
        title: entry.title,
        anchor: entry.anchor,
        content: entry.content,
        chunks: entry.chunks,
        tags: entry.tags,
      },
    };
  }

  async addEntry(data: any) {
    const entry = await this.prisma.knowledgeBase.create({
      data: {
        title: data.title,
        anchor: data.anchor,
        content: data.content || data.chunks.join('\n'),
        chunks: data.chunks,
        tags: data.tags || data.title.toLowerCase().split(' '),
      },
    });

    return {
      success: true,
      id: entry.id,
      anchor: entry.anchor,
    };
  }

  private extractSnippet(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.slice(0, 200) + '...';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    
    return (start > 0 ? '...' : '') + 
           content.slice(start, end) + 
           (end < content.length ? '...' : '');
  }

  private calculateRelevance(entry: any, query: string): number {
    const q = query.toLowerCase();
    let score = 0;

    if (entry.title.toLowerCase().includes(q)) score += 3;
    if (entry.anchor.toLowerCase().includes(q)) score += 2;
    if (entry.tags.some((t: string) => t.includes(q))) score += 1;
    
    const contentMatches = (entry.content.toLowerCase().match(new RegExp(q, 'g')) || []).length;
    score += Math.min(contentMatches * 0.5, 3);

    return Math.min(score / 9, 1);
  }
}