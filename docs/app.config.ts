// https://github.com/nuxt-themes/docus/blob/main/nuxt.schema.ts
export default defineAppConfig({
  docus: {
    title: 'SparkyFitness Docs',
    description: 'Docs and guides around SparkyFitness',
    socials: {
      github: 'CodeWithCJ/SparkyFitness',
    },
    aside: {
      level: 0,
      collapsed: false,
      exclude: []
    },
    main: {
      padded: true,
      fluid: true
    },
    header: {
      logo: true,
      showLinkIcon: true,
      exclude: [],
      fluid: true
    },
    // Add a home property to explicitly define the home page
    home: {
      title: 'Welcome to SparkyFitness',
      description: 'Your comprehensive fitness tracking solution.'
    },
    navigation: {
      enabled: true,
      items: [
        {
          title: 'Overview',
          to: '/'
        },
        {
          title: 'Install',
          to: '/install'
        },
        {
          title: 'Features',
          to: '/features'
        },
        {
          title: 'Guides',
          to: '/guides'
        },
        {
          title: 'Developer',
          to: '/developer'
        },
        {
          title: 'Administration',
          to: '/administration'
        },
        {
          title: 'FAQ',
          to: '/faq'
        },
        {
          title: 'Help Me!',
          to: '/help-me'
        },
        {
          title: 'Community Guides',
          to: '/community-guides'
        },
        {
          title: 'Support The Project',
          to: '/support-the-project'
        }
      ]
    }
  }
})
