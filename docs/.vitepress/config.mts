import { defineConfig } from 'vitepress';

// The default makes the generated site work when the repository itself is
// served by a plain static server. Deployments can override this, for example
// DOCS_BASE=/scrollylite/ for GitHub Pages.
const base = process.env.DOCS_BASE || '/docs/.vitepress/dist/';

export default defineConfig({
  title: 'ScrollyLite',
  description: 'Declarative visualization states and seekable animated transitions.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: [
    'release-0.2.0.md',
    'migrating-to-0.2.md'
  ],
  head: [
    ['meta', { name: 'theme-color', content: '#f7f8fc' }],
    ['link', {
      rel: 'icon',
      href: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect x="8" y="20" width="14" height="34" rx="4" fill="%231c6ae4"/%3E%3Crect x="26" y="10" width="14" height="44" rx="4" fill="%23fa4d1d"/%3E%3Crect x="44" y="28" width="14" height="26" rx="4" fill="%2303b976"/%3E%3C/svg%3E'
    }]
  ],
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    siteTitle: 'ScrollyLite',
    nav: [
      { text: 'Language map', link: '/language-framework' },
      { text: 'Guide', link: '/getting-started' },
      { text: 'API Reference', link: '/reference' },
      { text: 'Examples', link: '/examples' },
      { text: '0.2.0', items: [
        { text: 'Changelog', link: 'https://github.com/SonghaiFan/scrollylite/blob/main/CHANGELOG.md' },
        { text: 'npm package', link: 'https://www.npmjs.com/package/scrollylite' }
      ] }
    ],
    sidebar: [
      {
        text: 'Start',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Language framework', link: '/language-framework' },
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Mental model', link: '/concepts' },
          { text: 'Interactive reference', link: '/reference' },
          { text: 'Examples', link: '/examples' }
        ]
      },
      {
        text: 'Authoring language',
        items: [
          { text: 'Chart idioms', link: '/chart-idioms' },
          { text: 'Story builder', link: '/story-builder' },
          { text: 'Data sources', link: '/data-sources-and-transforms' },
          { text: 'Transform grammar', link: '/data-transforms' },
          { text: 'Color guide', link: '/color-guide' }
        ]
      },
      {
        text: 'Animation and runtime',
        items: [
          { text: 'Visualization transitions', link: '/visualization-transitions' },
          { text: 'Delta and transition planning', link: '/scenes-and-transitions' },
          { text: 'Runtime API', link: '/runtime-api' },
          { text: 'Layouts, themes, and scroll', link: '/layouts-themes-and-scrolling' },
          { text: 'Transition performance', link: '/transition-performance' }
        ]
      },
      {
        text: 'Integration',
        items: [
          { text: 'Modules and bundle boundaries', link: '/modular-architecture' },
          { text: 'Plugins', link: '/extending-with-plugins' },
          { text: 'CDN users', link: '/for-cdn-users' },
          { text: 'Contributors', link: '/for-developers' }
        ]
      }
    ],
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },
    outline: {
      level: [2, 3],
      label: 'On this page'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SonghaiFan/scrollylite' }
    ],
    editLink: {
      pattern: 'https://github.com/SonghaiFan/scrollylite/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'ScrollyLite 0.2 documentation'
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next'
    }
  }
});
