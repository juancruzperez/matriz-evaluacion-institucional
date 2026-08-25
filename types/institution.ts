export interface Institution {
  id: string
  cue: string
  name: string
  address: string
  sector: string
  latitude: number | null
  longitude: number | null
  levels: InstitutionLevel[]
}

export interface InstitutionLevel {
  id: string
  institutionId: string
  level: string
  empresa?: string
}