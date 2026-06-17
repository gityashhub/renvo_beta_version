interface Props {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: 'var(--neutral-500)', marginBottom: 24 }}>
        {description ?? 'This page is coming soon as part of the next phase.'}
      </p>
      <div style={{
        background: 'var(--neutral-50)',
        border: '2px dashed var(--neutral-200)',
        borderRadius: 12,
        padding: 48,
        textAlign: 'center',
        color: 'var(--neutral-400)',
        fontSize: 40,
      }}>
        🚧
        <div style={{ fontSize: 16, marginTop: 12, color: 'var(--neutral-500)' }}>
          Under construction
        </div>
      </div>
    </div>
  )
}
