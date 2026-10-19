import { createFormHook, revalidateLogic } from '@tanstack/react-form'

import AuthField from '@/components/block/form/auth-field'
import OtpField from '@/components/block/form/otp-field'
import PasswordField from '@/components/block/form/password-field'
import RichTextField from '@/components/block/form/rich-text-field'
import SelectField from '@/components/block/form/select-field'
import SubmitButton from '@/components/block/form/submit'
import SwitchField from '@/components/block/form/switch-field'
import TextField from '@/components/block/form/text-field'
import TextareaField from '@/components/block/form/textarea-field'

import { fieldContext, formContext } from './form-context'

export const { useAppForm } = createFormHook({
  fieldComponents: {
    AuthField,
    OtpField,
    TextField,
    PasswordField,
    SelectField,
    TextareaField,
    RichTextField,
    SwitchField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})

/**
 * When a form is checked against its schema (validators.onDynamic): on
 * sending it, and from then on as its fields change. Nobody is told an email
 * is wrong while they are still typing it for the first time.
 */
export const checked = revalidateLogic()
