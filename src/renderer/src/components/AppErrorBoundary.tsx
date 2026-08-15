import { Component, type ErrorInfo, type ReactNode } from 'react'
import { FatalErrorScreen } from './FatalErrorScreen'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State { return { hasError: true } }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected renderer error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) return <FatalErrorScreen title="حدث خطأ غير متوقع" message="تعذر عرض هذه الصفحة بشكل صحيح. أعد تحميل التطبيق، وإذا استمرت المشكلة فأعد تشغيل البرنامج." />
    return this.props.children
  }
}
