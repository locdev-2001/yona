// Copy từ components-next/HelpCenter/EmptyState/Portal/portalEmptyStateContent.js
// (dữ liệu giả cho trạng thái rỗng — giữ nguyên từng chữ để khớp pixel).
import type { ArticleCardCategory } from '../components/ArticleCard';

export interface EmptyStateArticle {
    id: number;
    title: string;
    status: string;
    updatedAt: number;
    author: { availableName: string };
    category: ArticleCardCategory;
    views: number;
}

const portalEmptyStateContent: EmptyStateArticle[] = [
  {
    id: 1,
    title: "How to get an SSL certificate for your Help Center's custom domain",
    status: 'draft',
    updatedAt: 1729205669,
    author: { availableName: 'Michael' },
    category: {
      slug: 'configuration',
      icon: '📦',
      name: 'Setup & Configuration',
    },
    views: 3400,
  },
  {
    id: 2,
    title: 'Setting up your first Help Center portal',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'John' },
    category: { slug: 'onboarding', icon: '🧑‍🍳', name: 'Onboarding' },
    views: 400,
  },
  {
    id: 3,
    title: 'Best practices for organizing your Help Center content',
    status: 'archived',
    updatedAt: 1729205669,
    author: { availableName: 'Fernando' },
    category: { slug: 'best-practices', icon: '⛺️', name: 'Best Practices' },
    views: 400,
  },
  {
    id: 4,
    title: 'Customizing the appearance of your Help Center',
    status: 'draft',
    updatedAt: 1729205669,
    author: { availableName: 'Jane' },
    category: { slug: 'design', icon: '🎨', name: 'Design' },
    views: 400,
  },
  {
    id: 5,
    title: 'Integrating your Help Center with third-party tools',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'Sarah' },
    category: {
      slug: 'integrations',
      icon: '🔗',
      name: 'Integrations',
    },
    views: 2800,
  },
  {
    id: 6,
    title: 'Managing user permissions in your Help Center',
    status: 'draft',
    updatedAt: 1729205669,
    author: { availableName: 'Alex' },
    category: {
      slug: 'administration',
      icon: '🔐',
      name: 'Administration',
    },
    views: 1200,
  },
  {
    id: 7,
    title: 'Creating and managing FAQ sections',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'Emily' },
    category: {
      slug: 'content-management',
      icon: '📝',
      name: 'Content Management',
    },
    views: 5600,
  },
  {
    id: 8,
    title: 'Implementing search functionality in your Help Center',
    status: 'archived',
    updatedAt: 1729205669,
    author: { availableName: 'David' },
    category: {
      slug: 'features',
      icon: '🔍',
      name: 'Features',
    },
    views: 1800,
  },
  {
    id: 9,
    title: 'Analyzing Help Center usage metrics',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'Rachel' },
    category: {
      slug: 'analytics',
      icon: '📊',
      name: 'Analytics',
    },
    views: 3200,
  },
  {
    id: 10,
    title: 'Setting up multilingual support in your Help Center',
    status: 'draft',
    updatedAt: 1729205669,
    author: { availableName: 'Carlos' },
    category: {
      slug: 'localization',
      icon: '🌍',
      name: 'Localization',
    },
    views: 900,
  },
  {
    id: 11,
    title: 'Creating interactive tutorials for your products',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'Olivia' },
    category: {
      slug: 'education',
      icon: '🎓',
      name: 'Education',
    },
    views: 4100,
  },
  {
    id: 12,
    title: 'Implementing a feedback system in your Help Center',
    status: 'draft',
    updatedAt: 1729205669,
    author: { availableName: 'Nathan' },
    category: {
      slug: 'user-engagement',
      icon: '💬',
      name: 'User Engagement',
    },
    views: 750,
  },
  {
    id: 13,
    title: 'Optimizing Help Center content for SEO',
    status: 'published',
    updatedAt: 1729205669,
    author: { availableName: 'Sophia' },
    category: {
      slug: 'seo',
      icon: '🚀',
      name: 'SEO',
    },
    views: 2900,
  },
  {
    id: 14,
    title: 'Creating a knowledge base for internal teams',
    status: 'archived',
    updatedAt: 1729205669,
    author: { availableName: 'Daniel' },
    category: {
      slug: 'internal-resources',
      icon: '🏢',
      name: 'Internal Resources',
    },
    views: 1500,
  },
];

export default portalEmptyStateContent;
