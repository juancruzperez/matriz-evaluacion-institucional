export interface Institution {
id: string
cue: string
name: string
address: string
sector: string

// Ubicación
latitude: number | null
longitude: number | null
localidad: string | null
departamento: string | null
ambito: string | null

// Contacto
telefono: string[]
email: string[]

// Autoridad vigente
directivo: InstitutionDirective | null

// Oferta educativa
levels: InstitutionLevel[]
}

export interface InstitutionDirective {
id: string
nombre: string
desde: string | null
hasta: string | null
}

export interface InstitutionLevel {
id: string
institutionId: string
level: string
empresa?: string | null
modalidad?: string | null
studyPlans?: StudyPlan[]
}

export interface StudyPlan {
id: string
nombre: string
}
