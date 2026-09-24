export interface TunnelExit {
  exitCode: number | null
}

export interface TunnelConnection {
  url: string
  exited: Promise<TunnelExit>
}

export interface TunnelProvider {
  readonly name: string
  connect(options: {
    port: number
    signal: AbortSignal
  }): Promise<TunnelConnection>
  disconnect(): Promise<void>
}
