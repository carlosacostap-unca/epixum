'use client'
import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
)

const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
)

interface EditorProps {
    value: string
    onChange: (value?: string) => void
    height?: number
}

export const RichTextEditor = ({ value, onChange, height = 200 }: EditorProps) => {
    return (
        <div data-color-mode="dark" className="rich-text-editor">
            <MDEditor 
                value={value} 
                onChange={onChange} 
                preview="edit" 
                height={height}
                style={{ backgroundColor: '#000', color: '#e5e7eb' }}
                textareaProps={{
                    placeholder: 'Escribe aquí... (soporta Markdown)'
                }}
            />
        </div>
    )
}

interface RendererProps {
    source: string
}

export const RichTextRenderer = ({ source }: RendererProps) => {
    return (
        <div data-color-mode="dark" className="rich-text-renderer text-gray-200">
            <MDPreview 
                source={source} 
                style={{ 
                    backgroundColor: 'transparent', 
                    color: 'inherit',
                    fontSize: '0.95rem' 
                }} 
            />
        </div>
    )
}
