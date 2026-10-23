// React Imports
import { useId, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react'

// Third-party Imports
import { XIcon } from '@admin/components/icons'

// Component Imports
import { Button } from '@admin/components/ui/button'
import { Input } from '@admin/components/ui/input'
import { Label } from '@admin/components/ui/label'

// Util Imports
import { cn } from '@admin/lib/utils'

import { parseKeywordInput } from 'dashboard/settings/customStickers/stickerKeywords'
import { isCounterVisible } from 'dashboard/settings/customStickers/stickerLimits'
import type { StickerLimits, StickerMetaErrors } from 'dashboard/settings/customStickers/stickerLimits'
import type { LibrarySticker, LibraryStickerChanges } from 'dashboard/settings/customStickers/types'

import { t } from '../../../i18n'

// Bản nháp Nhãn + Từ khoá; `keywordInput` là chữ đang gõ chưa thành chip.
export interface StickerMetaDraft {
  label: string
  keywords: string[]
  keywordInput: string
}

export const draftFromSticker = (sticker: Pick<LibrarySticker, 'label' | 'keywords'>): StickerMetaDraft => ({
  label: sticker.label ?? '',
  keywords: [...sticker.keywords],
  keywordInput: ''
})

export function changesFromDraft(draft: StickerMetaDraft): LibraryStickerChanges {
  return {
    label: draft.label.trim() || null,
    keywords: parseKeywordInput([...draft.keywords, draft.keywordInput].join(','))
  }
}

export function isDraftChanged(draft: StickerMetaDraft, sticker: Pick<LibrarySticker, 'label' | 'keywords'>): boolean {
  const changes = changesFromDraft(draft)

  return (
    changes.label !== (sticker.label?.trim() || null) ||
    changes.keywords.join('\u0000') !== sticker.keywords.join('\u0000')
  )
}

type StickerMetaFieldsProps = {
  draft: StickerMetaDraft
  limits: StickerLimits
  errors: StickerMetaErrors
  disabled?: boolean
  labelRef?: RefObject<HTMLInputElement | null>
  onChange: (draft: StickerMetaDraft, changedField: keyof StickerMetaErrors) => void
}

// Nhãn và từ khoá của sticker: từ khoá gõ xong Enter hoặc dấu phẩy thành chip.
const StickerMetaFields = ({ draft, limits, errors, disabled = false, labelRef, onChange }: StickerMetaFieldsProps) => {
  const fieldId = useId()
  const keywordInputRef = useRef<HTMLInputElement>(null)
  const labelErrorId = `${fieldId}-label-error`
  const keywordsHintId = `${fieldId}-keywords-hint`
  const keywordsErrorId = `${fieldId}-keywords-error`
  const isKeywordLimitReached = draft.keywords.length >= limits.maxKeywords

  const setKeywords = (keywords: string[], keywordInput: string) =>
    onChange({ ...draft, keywords: keywords.slice(0, limits.maxKeywords), keywordInput }, 'keywords')

  const commitKeywordInput = (text = draft.keywordInput) => {
    if (!text.trim()) return
    setKeywords(parseKeywordInput([...draft.keywords, text].join(',')), '')
  }

  const onKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      commitKeywordInput()
    } else if (event.key === 'Backspace' && draft.keywordInput === '' && draft.keywords.length > 0) {
      setKeywords(draft.keywords.slice(0, -1), '')
    }
  }

  const onKeywordPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text')

    if (!pasted.includes(',')) return
    event.preventDefault()
    commitKeywordInput(`${draft.keywordInput}${pasted}`)
  }

  return (
    <div className='space-y-6'>
      <div className='w-full space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <Label htmlFor={`${fieldId}-label`}>{t('STICKER_LIBRARY.LABEL')}</Label>
          {isCounterVisible(draft.label.length, limits.maxLabelLength) ? (
            <span className='text-muted-foreground text-xs'>
              {draft.label.length}/{limits.maxLabelLength}
            </span>
          ) : null}
        </div>
        <Input
          ref={labelRef}
          id={`${fieldId}-label`}
          value={draft.label}
          disabled={disabled}
          enterKeyHint='next'
          aria-invalid={errors.label ? true : undefined}
          aria-describedby={errors.label ? labelErrorId : undefined}
          onChange={event => onChange({ ...draft, label: event.target.value }, 'label')}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
              event.preventDefault()
              keywordInputRef.current?.focus()
            }
          }}
        />
        {errors.label ? (
          <p id={labelErrorId} className='text-destructive text-xs'>
            {errors.label}
          </p>
        ) : null}
      </div>

      <div className='w-full space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <Label htmlFor={`${fieldId}-keywords`}>{t('STICKER_LIBRARY.KEYWORDS')}</Label>
          <span className='text-muted-foreground text-xs'>
            {draft.keywords.length}/{limits.maxKeywords}
          </span>
        </div>
        <div
          aria-invalid={errors.keywords ? true : undefined}
          className={cn(
            'border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-3 has-[[data-slot=keyword-chip]]:px-1.5',
            errors.keywords && 'border-destructive ring-destructive/20 ring-3'
          )}
          onClick={() => keywordInputRef.current?.focus()}
        >
          {draft.keywords.map((keyword, index) => (
            <span
              key={keyword}
              data-slot='keyword-chip'
              className={cn(
                'bg-muted text-foreground flex h-[calc(--spacing(5.5))] w-fit max-w-full items-center justify-center gap-1 rounded-sm pr-0 pl-1.5 text-xs font-medium whitespace-nowrap',
                keyword.length > limits.maxKeywordLength && 'bg-destructive/10 text-destructive'
              )}
            >
              <span className='truncate'>{keyword}</span>
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                disabled={disabled}
                className='-ml-1 opacity-50 hover:opacity-100'
                aria-label={t('STICKER_LIBRARY.REMOVE_KEYWORD', { keyword })}
                onClick={event => {
                  event.stopPropagation()
                  setKeywords(
                    draft.keywords.filter((_, keywordIndex) => keywordIndex !== index),
                    draft.keywordInput
                  )
                }}
              >
                <XIcon className='pointer-events-none' />
              </Button>
            </span>
          ))}
          <input
            ref={keywordInputRef}
            id={`${fieldId}-keywords`}
            type='text'
            className='placeholder:text-muted-foreground min-w-16 flex-1 bg-transparent outline-none disabled:cursor-not-allowed'
            value={draft.keywordInput}
            disabled={disabled || isKeywordLimitReached}
            placeholder={
              isKeywordLimitReached
                ? t('STICKER_LIBRARY.KEYWORDS_FULL')
                : t('STICKER_LIBRARY.KEYWORD_CHIP_PLACEHOLDER')
            }
            enterKeyHint='done'
            aria-invalid={errors.keywords ? true : undefined}
            aria-describedby={errors.keywords ? `${keywordsErrorId} ${keywordsHintId}` : keywordsHintId}
            onChange={event => onChange({ ...draft, keywordInput: event.target.value }, 'keywords')}
            onKeyDown={onKeywordKeyDown}
            onPaste={onKeywordPaste}
            onBlur={() => commitKeywordInput()}
          />
        </div>
        {errors.keywords ? (
          <p id={keywordsErrorId} className='text-destructive text-xs'>
            {errors.keywords}
          </p>
        ) : null}
        <p id={keywordsHintId} className='text-muted-foreground text-xs'>
          {t('STICKER_LIBRARY.KEYWORDS_HINT')}
        </p>
      </div>
    </div>
  )
}

export default StickerMetaFields
