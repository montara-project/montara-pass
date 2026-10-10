'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { Models } from '@/lib/api/models'
import type { BaseAbstractForm } from '@/types/form'

import SimpleAlertScrollableDialogForm from '@/components/block/common/simple-alert-scrollable-dialog-form'
import { useAppForm } from '@/hooks/form'
import { toastAxiosError } from '@/lib/api/axios-error'
import {
  CategoryFormSchema,
  type CategoryFormDto,
} from '@/lib/api/dtos/category/schema'
import { parseDto } from '@/lib/api/dtos/parse'
import { queries } from '@/lib/api/queries'

type TModel = CategoryFormDto
type TMutation = CategoryFormDto
type TDto = CategoryFormDto
type TResponse = Models.Category

type AbstractFormProps = BaseAbstractForm<TModel, TMutation, TDto, TResponse> & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AbstractForm({
  open,
  onOpenChange,
  defaultValues,
  schema,
  mutation,
  isEdit,
}: AbstractFormProps) {
  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: schema,
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync(parseDto(schema, value))
        toast.success(`Category ${isEdit ? 'updated' : 'created'} successfully`)
        onOpenChange(false)
        form.reset()
      } catch (error) {
        toastAxiosError(error)
      }
    },
  })

  return (
    <SimpleAlertScrollableDialogForm
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      open={open}
      onOpenChange={onOpenChange}
      title={`${isEdit ? 'Edit' : 'Create'} Category`}
      confirmText={isEdit ? 'Update' : 'Save'}
      loading={mutation.isPending}
      size="md"
    >
      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField asterisk label="Name" placeholder="e.g. Category Name" />
        )}
      />
    </SimpleAlertScrollableDialogForm>
  )
}

type AddCategoryFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCategoryForm({ open, onOpenChange }: AddCategoryFormProps) {
  const mutation = useMutation(queries.categories.create())

  return (
    <AbstractForm
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={{
        name: '',
      }}
      schema={CategoryFormSchema}
      mutation={mutation}
    />
  )
}

type EditCategoryFormProps = AddCategoryFormProps & {
  record: Models.Category
}

export function EditCategoryForm({ open, onOpenChange, record }: EditCategoryFormProps) {
  const mutation = useMutation(queries.categories.update(record.id))

  return (
    <AbstractForm
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={{ ...record }}
      schema={CategoryFormSchema}
      mutation={mutation}
      isEdit
    />
  )
}
