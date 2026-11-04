// The self-check of describeActivity and deviceName: how a log row reads.
// Run: node packages/shared/src/activity.check.ts

import assert from 'node:assert/strict'

import type { Activity } from './api/models/activity'

// By address, so Node finds the file without the bundler's resolution.
const { describeActivity, deviceName } = (await import(
  new URL('./activity.ts', import.meta.url).href
)) as typeof import('./activity')

const me = { id: 'me', name: 'Aji', email: 'aji@mail.com' }
const ana = { id: 'ana', name: 'Ana', email: 'ana@mail.com' }
const row = (rest: Partial<Activity>): Activity => ({
  id: '1',
  created_at: '2026-11-04T00:00:00Z',
  action: 'item_created',
  item_id: 'i',
  item_type: 'login',
  actor: me,
  subject: null,
  role: null,
  ip: null,
  user_agent: null,
  ...rest,
})

assert.equal(
  describeActivity(row({ action: 'sign_in', item_id: null, item_type: null }), 'me'),
  'You signed in'
)
assert.equal(describeActivity(row({}), 'me', 'GitHub'), 'You created GitHub')
// An item the reader's vault does not hold is named by its type.
assert.equal(
  describeActivity(row({ action: 'item_deleted' }), 'me'),
  'You deleted a login for good'
)
assert.equal(
  describeActivity(row({ action: 'item_shared', subject: ana, role: 'viewer' }), 'me', 'GitHub'),
  'You shared GitHub with Ana as viewer'
)
// Seen by the member it was about.
assert.equal(
  describeActivity(
    row({ action: 'item_role_changed', subject: ana, role: 'editor' }),
    'ana',
    'GitHub'
  ),
  'Aji made you an editor of GitHub'
)
assert.equal(
  describeActivity(
    row({ action: 'item_member_removed', actor: ana, subject: ana }),
    'me',
    'GitHub'
  ),
  'Ana left GitHub'
)
assert.equal(
  describeActivity(row({ action: 'item_member_removed', subject: ana, item_type: 'card' }), 'ana'),
  'Aji removed you from a card'
)
// A user without a name goes by their email.
assert.equal(
  describeActivity(row({ action: 'item_updated', actor: { ...ana, name: '' } }), 'me', 'GitHub'),
  'ana@mail.com changed GitHub'
)

const chromeMac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36'
assert.equal(deviceName(chromeMac), 'Chrome on macOS')
assert.equal(
  deviceName(
    `${chromeMac.replace('Macintosh; Intel Mac OS X 10_15_7', 'Windows NT 10.0')} Edg/142.0`
  ),
  'Edge on Windows'
)
assert.equal(
  deviceName('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'),
  'Firefox on Linux'
)
// Chrome and Edge on an iPhone say Safari too, under their own names.
assert.equal(
  deviceName(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'
  ),
  'Chrome on iOS'
)
assert.equal(
  deviceName(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/131.0.2903.70 Mobile/15E148 Safari/605.1.15'
  ),
  'Edge on iOS'
)
assert.equal(deviceName('Go-http-client/1.1'), '')
assert.equal(deviceName(null), '')

console.log('activity: ok')
