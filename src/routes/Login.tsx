import Page from '../components/ui/Page'

export default function Login() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Page
        title="Sign in"
        subtitle="Authentication is wired up in M1. It is the only screen reachable without a session."
      />
    </div>
  )
}
