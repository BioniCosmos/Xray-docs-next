module.exports = {
  locales: {
    '/': {
      lang: 'zh-CN',
      title: 'Project X',
      description: 'Xray 官方文档'
    },
    '/en/': {
      lang: 'en-US',
      title: 'Project X',
      description: 'Xray official documentation'
    }
  },
  head: [
    ['link', { rel: 'icon', href: `/logo.png` }]
  ],
  themeConfig: {
    smoothScroll: true,
    themeChange: true,
    docsRepo: 'xtls/Xray-docs-next',
    docsDir: 'docs',
    docsBranch: 'main',
    editLinks: true,
    locales: {
      '/': {
        label: '简体中文',
        selectText: '选择语言',
        ariaLabel: '选择语言',
        editLinkText: '帮助我们改善此页面！',
        lastUpdated: '上次更新',
        themeChangeText: '切换主题',
        nav: require('./nav/zh'),
        sidebar: {
          '/config/': getConfigSidebar('特性详解', '基础配置', '入站代理', '出站代理', '底层传输', '/'),
          '/document/level-0/': getL0Sidebar(),
          '/document/level-1/': getL1Sidebar(),
          '/document/level-2/': getL2Sidebar(),
          '/': 'auto'
        }
      },
      '/en/': {
        label: 'English',
        selectText: 'Languages',
        ariaLabel: 'Select language',
        editLinkText: 'Help us improve this page!',
        lastUpdated: 'Last Updated',
        themeChangeText: 'Switch themes',
        nav: require('./nav/en'),
        sidebar: {
          '/en/config/': getConfigSidebar('Feature Details', 'Basic Config', 'Inbounds', 'Outbounds', 'Transport', '/en/'),
          '/en/document/level-0/': getL0Sidebar(),
          '/en/document/level-1/': getL1Sidebar(),
          '/en/document/level-2/': getL2Sidebar(),
          '/en/': 'auto'
        }
      }
    }
  },
  plugins: [
    "@vuepress/back-to-top",
    "vuepress-plugin-mermaidjs"
  ],
  extraWatchFiles: [
    '.vuepress/nav/en.js',
    '.vuepress/nav/zh.js'
  ],
  postcss: { plugins: [require("autoprefixer")] },
  markdown: {
    toc: {
      includeLevel: [2]
    },
    plugins: [
      'markdown-it-footnote'
    ]
  },
  chainWebpack: config => {
    config.module
      .rule("webp")
        .test(/\.(webp)(\?.*)?$/)
        .use("file-loader")
          .loader("file-loader")
          .options({
            name: `assets/img/[name].[hash:8].[ext]`
          })
  }
}

function getConfigSidebar(c_feature, c_config, c_in, c_out, c_transport, c_localePath) {
  return [
    {
      title: c_feature,
      children: [
        'features/vless',
        'features/xtls',
        'features/fallback',
        'features/env',
        'features/multiple'
      ]
    },
    {
      title: c_config,
      collapsable: false,
      path: c_localePath + 'config/',
      children: [
        'api',
        'dns',
        'fakedns',
        'inbound',
        'outbound',
        'policy',
        'reverse',
        'routing',
        'stats',
        'transport'
      ]
    },
    {
      title: c_in,
      collapsable: false,
      path: c_localePath + 'config/inbounds/',
      children: [
        'inbounds/dokodemo',
        'inbounds/http',
        'inbounds/shadowsocks',
        'inbounds/socks',
        'inbounds/trojan',
        'inbounds/vless',
        'inbounds/vmess'
      ]
    },
    {
      title: c_out,
      collapsable: false,
      path: c_localePath + 'config/outbounds/',
      children: [
        'outbounds/blackhole',
        'outbounds/dns',
        'outbounds/freedom',
        'outbounds/http',
        'outbounds/shadowsocks',
        'outbounds/socks',
        'outbounds/trojan',
        'outbounds/vless',
        'outbounds/vmess'
      ]
    },
    {
      title: c_transport,
      collapsable: false,
      path: c_localePath + 'config/transports/',
      children: [
        'transports/grpc',
        'transports/h2',
        'transports/mkcp',
        'transports/quic',
        'transports/tcp',
        'transports/websocket'
      ]
    }
  ]
}

function getL0Sidebar() {
  return [
    'ch01-preface',
    'ch02-preparation',
    'ch03-ssh',
    'ch04-security',
    'ch05-webpage',
    'ch06-certificates',
    'ch07-xray-server',
    'ch08-xray-clients',
    'ch09-appendix'
  ]
}

function getL1Sidebar() {
  return [
    'fallbacks-lv1',
    'routing-lv1-part1',
    'routing-lv1-part2',
    'work',
    'fallbacks-with-sni'
  ]
}

function getL2Sidebar() {
  return [
    'transparent_proxy/transparent_proxy',
    'tproxy',
    'iptables_gid',
    'redirect'
  ]
}
