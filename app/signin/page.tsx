import Image from "next/image"
import SignInButton from "./SignInButton"

export default function SignInPage() {
  return (
    <main className="signin-page">
      <section className="signin-card">
        <div className="signin-brand">
            <Image
                src="/SIATE.svg"
                alt="Sistema Integral de Acompañamiento Territorial Educativo"
                width={150}
                height={150}
                priority
                className="signin-logo"
            />

          <p className="eyebrow">Relevamiento y Seguimiento</p>

          <h1>Territorio en Acción</h1>

          <p className="signin-description">
            Sistema Integral de Acompañamiento Territorial Educativo
          </p>
        </div>

        <div className="signin-actions">
          <SignInButton />
        </div>
      </section>
    </main>
  )
}