import Image from "next/image"
import SignInButton from "./SignInButton"

type SignInPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams
  const error = params.error

  return (
    <main className="signin-page">
      <div className="signin-container">
        <div className="signin-institution-logo">
          <Image
            src="/logo-subsecretaria.svg"
            alt="Subsecretaría"
            width={220}
            height={80}
            priority
            className="signin-institution-logo-image"
          />
        </div>

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

            <p className="eyebrow">
              Relevamiento y Seguimiento
            </p>

            <h1>Territorio en Acción</h1>

            <p className="signin-description">
              Sistema Integral de Acompañamiento Territorial
              Educativo
            </p>
          </div>

          {error && (
            <div
              className="signin-error"
              role="alert"
            >
              <strong>
                No pudimos iniciar sesión.
              </strong>

              <p>
                Verificá que estés utilizando una cuenta
                autorizada e intentá nuevamente.
              </p>
            </div>
          )}

          <div className="signin-actions">
            <SignInButton />
          </div>
        </section>
      </div>
    </main>
  )
}