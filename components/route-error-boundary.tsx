"use client"

import type React from "react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

type Props = { children: ReactNode; title?: string }

type State = { error: Error | null }

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route error:", error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    const { children, title = "حدث خطأ في هذه الشاشة" } = this.props
    if (error) {
      return (
        <div className="p-6 space-y-4 text-center" dir="rtl">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground break-words" dir="auto">
            {error.message}
          </p>
          <Button type="button" onClick={this.handleReset}>
            إعادة المحاولة
          </Button>
        </div>
      )
    }
    return children
  }
}
