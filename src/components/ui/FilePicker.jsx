import { useRef, useState } from 'react'
import { Download, FileText, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/cn.js'
import { formatDateTime } from '@/lib/format.js'
import { useToast } from '@/components/ui/Toast.jsx'
import { useUploadFile } from '@/features/files/queries'
import { downloadFile, openFile } from '@/features/files/download'

/**
 * Поле выбора файла: клик открывает системный диалог, файл можно и просто
 * бросить на поле. Выбранный сразу уходит на сервер (`POST /files`); тип и
 * размер проверяет сервер — по назначению из `kind`.
 *
 * onPick получает `{ id, name, url, addedAt }` либо null, если файл убрали.
 * `id` — то, что уходит в сущность (`fileId`, `creativeId`, `logoId`),
 * `addedAt` проставляет сервер.
 */
export function FilePicker({
  name,
  url,
  addedAt,
  onPick,
  accept,
  /** Назначение файла: contract, creative или logo. */
  kind = 'contract',
  emptyLabel = 'Выбрать файл',
  // Подпись отдельной кнопки под полем — если файл уже загружен.
  downloadLabel,
  /**
   * Что делает кнопка под полем: `download` сохраняет файл на диск,
   * `open` открывает его в новой вкладке — так удобнее смотреть ролик.
   */
  action = 'download',
  /** Поле только для чтения: файл пришёл из другой сущности. */
  disabled = false,
  icon: Icon = FileText,
  className,
}) {
  const inputRef = useRef(null)
  const toast = useToast()
  const { mutate: uploadFile, isPending: uploading } = useUploadFile()
  // Файл тащат над полем — подсвечиваем, что его тут ждут.
  const [dragging, setDragging] = useState(false)

  const send = (picked) => {
    if (!picked || uploading || disabled) return
    uploadFile(
      { file: picked, kind },
      {
        onSuccess: (stored) =>
          onPick({
            id: stored.id,
            name: stored.name,
            url: stored.url,
            addedAt: stored.addedAt,
          }),
        onError: (error) =>
          toast.error(error.message || 'Не удалось загрузить файл'),
      },
    )
  }

  const pick = (e) => {
    const picked = e.target.files?.[0]
    // Сбрасываем input, иначе повторный выбор того же файла не сработает.
    e.target.value = ''
    send(picked)
  }

  const drop = (e) => {
    e.preventDefault()
    setDragging(false)
    // Папку и несколько файлов разом не берём — поле хранит один файл.
    send(e.dataTransfer.files?.[0])
  }

  const run = () => (action === 'open' ? openFile : downloadFile)({ name, url })

  // Файл, выбранный локально, уже лежит в blob: — его скачивать неоткуда.
  const downloadable = !!url && !url.startsWith('blob:')

  // Кнопки «скачать» и «убрать» держим соседями поля выбора, а не внутри него:
  // вложенные интерактивные элементы — невалидная разметка.
  return (
    // min-w-0 — чтобы длинное имя файла обрезалось, а не растягивало поле.
    <div className={cn('min-w-0 space-y-2', className)}>
      <div
        // Поле принимает файл и броском — обработчики висят на всей рамке,
        // а не на скрытом input: до него курсор не доводят.
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={disabled ? undefined : drop}
        className={cn(
          'flex h-11 w-full items-center gap-1 rounded-xl border pr-2 transition-colors',
          name
            ? 'border-line bg-surface hover:border-indigo-300'
            : 'border-dashed border-line bg-surface hover:border-indigo-300 hover:bg-indigo-50',
          dragging && 'border-solid border-indigo-400 bg-indigo-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={pick}
          // Поле стоит внутри <label>, поэтому клик по подписи доходит до
          // скрытого input и открывает системный диалог даже там, где
          // выбирать нечего. Флаг нужен и здесь, не только на кнопке.
          disabled={uploading || disabled}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          title={name || emptyLabel}
          className={cn(
            'flex h-full min-w-0 flex-1 items-center gap-2 rounded-xl pl-3.5 text-left text-sm focus-ring disabled:opacity-60',
            name ? 'text-ink' : 'text-ink-soft',
          )}
        >
          {uploading ? (
            <Loader2
              size={16}
              className="shrink-0 animate-spin text-ink-muted"
            />
          ) : name ? (
            <Icon size={16} className="shrink-0 text-indigo-800" />
          ) : (
            <Paperclip size={16} className="shrink-0 text-ink-muted" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {uploading ? 'Загружаем…' : name || emptyLabel}
          </span>
        </button>
        {name && downloadable && !downloadLabel && (
          <button
            type="button"
            onClick={run}
            aria-label="Скачать файл"
            title="Скачать файл"
            className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-ink/6 hover:text-indigo-800 focus-ring"
          >
            <Download size={14} />
          </button>
        )}
        {name && !disabled && (
          <button
            type="button"
            aria-label="Убрать файл"
            title="Убрать файл"
            onClick={() => onPick(null)}
            className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:bg-ink/6 hover:text-ink focus-ring"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Когда файл загрузили — видно всем, кто открывает карточку. */}
      {name && addedAt && (
        <p className="text-[11px] text-ink-muted tnum">
          Добавлен {formatDateTime(addedAt)}
        </p>
      )}

      {downloadLabel && name && downloadable && (
        <button
          type="button"
          onClick={run}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-paper/55 text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
        >
          <Download size={15} className="text-indigo-800" />
          {downloadLabel}
        </button>
      )}
    </div>
  )
}
