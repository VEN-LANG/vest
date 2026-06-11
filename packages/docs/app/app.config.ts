export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc'
    },
    button: {
      slots: {
        base: 'active:translate-y-px transition-transform duration-300'
      }
    },
    contentToc: {
      defaultVariants: {
        highlightVariant: 'circuit'
      }
    },
    contentSurround: {
      variants: {
        direction: {
          left: {
            linkLeadingIcon: [
              'group-active:-translate-x-0'
            ]
          },
          right: {
            linkLeadingIcon: [
              'group-active:translate-x-0'
            ]
          }
        }
      }
    },
    footer: {
      slots: {
        root: 'border-t border-default mt-12',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'LaraNode'
  },
  header: {
    title: '',
    to: '/',
    logo: {
      alt: 'LaraNode',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/laranode',
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  footer: {
    credits: `LaraNode Framework \u00A9 ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-npm',
      'to': 'https://www.npmjs.com/package/laranode',
      'target': '_blank',
      'aria-label': 'NPM'
    }, {
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/laranode',
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  toc: {
    title: 'On this page',
    bottom: {
      title: 'Links',
      edit: 'https://github.com/laranode/docs/edit/main/content',
      links: [{
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: 'https://github.com/laranode',
        target: '_blank'
      }, {
        icon: 'i-lucide-book-open',
        label: 'Documentation',
        to: '/getting-started',
        target: '_blank'
      }]
    }
  }
})
