export type VaultCategory = {
  count: number
  icon: 'card-outline' | 'globe-outline' | 'phone-portrait-outline'
  label: string
}

export type VaultItem = {
  email: string
  favorite: boolean
  id: string
  letter: string
  letterColor: string
  name: string
}

const amazon: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: true,
  id: 'amazon',
  letter: 'a',
  letterColor: '#131A22',
  name: 'Amazon Prime',
}

const gmail: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: false,
  id: 'gmail',
  letter: 'M',
  letterColor: '#EA4335',
  name: 'Gmail',
}

const messenger: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: true,
  id: 'messenger',
  letter: 'M',
  letterColor: '#A033FF',
  name: 'Messenger',
}

const udemy: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: true,
  id: 'udemy',
  letter: 'U',
  letterColor: '#A435F0',
  name: 'Udemy',
}

const netflix: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: false,
  id: 'netflix',
  letter: 'N',
  letterColor: '#E50914',
  name: 'Netflix',
}

const coursera: VaultItem = {
  email: 'hello@designmonk.com',
  favorite: true,
  id: 'coursera',
  letter: 'C',
  letterColor: '#0056D2',
  name: 'Coursera',
}

export const vaultItems: VaultItem[] = [amazon, gmail, messenger, udemy, netflix, coursera]

/** The rows shown under "Recently Used" on the home screen. */
export const recentVaults: VaultItem[] = [netflix, messenger]

export const vaultCategories: VaultCategory[] = [
  { count: 18, icon: 'globe-outline', label: 'Browser' },
  { count: 12, icon: 'phone-portrait-outline', label: 'Mobile App' },
  { count: 6, icon: 'card-outline', label: 'Payment' },
]
