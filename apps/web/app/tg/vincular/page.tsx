import { LinkForm } from './link-form';

export default function VincularPage() {
  return (
    <div className="min-h-screen p-5 pt-8 flex flex-col">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold">Vincular cuenta</h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Conecta tu Telegram con tu cuenta de Academia J Rubio para acceder desde aquí.
          Solo necesitas hacerlo una vez.
        </p>
      </div>

      <LinkForm />

      {/* Benefits */}
      <div className="mt-8 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Después de vincular podrás
        </p>
        {[
          ['📁', 'Buscar y descargar archivos desde Telegram'],
          ['🤖', 'Usar el asistente IA sin salir del chat'],
          ['💬', 'Ver y participar en el foro técnico'],
          ['🔔', 'Recibir notificaciones directamente aquí'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 text-sm">
            <span className="text-xl">{icon}</span>
            <span style={{ color: 'var(--color-muted)' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
