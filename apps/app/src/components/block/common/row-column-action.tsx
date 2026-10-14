import { IconDots, IconEye, IconPencil, IconTrash } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RowColumnActionProps {
  onShow?: () => void
  onEdit?: () => void
  onDelete?: () => void
  dropdown?: React.ReactNode
  actions?: React.ReactNode
}

/** What may be done with a row: the common one as a button, the rest behind More. */
export default function RowColumnAction({
  onShow,
  onEdit,
  onDelete,
  dropdown,
  actions,
}: RowColumnActionProps) {
  return (
    <div className="flex flex-row items-center gap-1">
      {onEdit && (
        <Button variant="outline" size="xs" onClick={onEdit}>
          <IconPencil />
          Edit
        </Button>
      )}

      {actions}

      {(onShow || onDelete || dropdown) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" mode="icon" size="sm" aria-label="More">
              <IconDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-44" align="end">
            <DropdownMenuGroup>
              {onShow && (
                <DropdownMenuItem onClick={onShow}>
                  <IconEye />
                  Show
                </DropdownMenuItem>
              )}

              {dropdown}

              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <IconTrash />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
