export const SKILL_KEYWORDS = {
  ux: ['ux', 'user experience', 'usability', 'user research', 'ux design', 'gebruikerservaring', 'interaction design'],
  ui: ['ui', 'user interface', 'visual design', 'ui design', 'interface design'],
  frontend: ['frontend', 'front-end', 'front end', 'web developer', 'web development'],
  nextjs: ['next.js', 'nextjs', 'next js'],
  react: ['react', 'reactjs', 'react.js'],
  designSystem: ['design system', 'storybook', 'component library', 'design tokens', 'tokens studio'],
  figma: ['figma', 'sketch', 'adobe xd'],
  typescript: ['typescript'],
  product: ['product designer', 'product design', 'product manager'],
} as const

export type SkillKey = keyof typeof SKILL_KEYWORDS

export const KEYWORD_WEIGHTS: Record<SkillKey, number> = {
  ux: 20,
  ui: 15,
  frontend: 10,
  nextjs: 15,
  react: 10,
  designSystem: 15,
  figma: 5,
  typescript: 5,
  product: 10,
}

export const SIGNAL_WEIGHTS: Record<string, number> = {
  'dev-vacature zonder design': 30,
  'digital product team': 25,
  'recente groei': 20,
  'startup': 15,
  'series A+': 20,
  'no designer on team': 30,
  'UX-budget aanwezig': 25,
}
