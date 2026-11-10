import { COMMUNITY } from '@montara-pass/shared/constants/edition'

import Folders from './folders'
import SettingsFrame from './frame'
import Shared from './shared'

/** Settings, on its General tab: how the vault is organised, and what is shared. */
export default function Settings() {
  return (
    <SettingsFrame>
      <Folders />
      {!COMMUNITY && <Shared />}
    </SettingsFrame>
  )
}
