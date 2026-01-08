import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <Pages />
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          style: {
            background: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          },
        }}
      />
    </>
  )
}

export default App