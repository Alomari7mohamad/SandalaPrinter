import { AlertTriangle, RefreshCw } from 'lucide-react'

export function FatalErrorScreen({ title, message }: { title: string; message: string }) {
  return <main className="fatal-screen" dir="rtl" role="alert">
    <section className="fatal-card">
      <div className="fatal-icon"><AlertTriangle size={32} /></div>
      <h1>{title}</h1>
      <p>{message}</p>
      <button className="primary-button" onClick={() => window.location.reload()}><RefreshCw size={17} /> إعادة تحميل التطبيق</button>
    </section>
  </main>
}
