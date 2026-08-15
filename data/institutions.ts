export type InstitutionLevel = {
  level: string
  empresa: string
}

export type Institution = {
  id: string
  name: string
  empresa: string
  cue: string
  levelSource: string
  sector: string
  address: string
  levels: InstitutionLevel[]
}

export const institutions: Institution[] = [
  {
    "id": "inst-001",
    "name": "C.E.N.M.A. BATERIA LIBERTAD ANEXO SEDE AGENCIA CORDOBA DEPORTE",
    "empresa": "EE0117213",
    "cue": "140564803",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "AV. COLON 778",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0117213"
      }
    ]
  },
  {
    "id": "inst-002",
    "name": "C.E.N.M.A. N° 135 - ANEXO SEDE ALECYT",
    "empresa": "EE0117152",
    "cue": "140236405",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "9 DE JULIO 975",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0117152"
      }
    ]
  },
  {
    "id": "inst-003",
    "name": "C.E.N.M.A. Nº 135",
    "empresa": "EE0110093",
    "cue": "140236400",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "SANTA ROSA 1299",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0110093"
      }
    ]
  },
  {
    "id": "inst-004",
    "name": "C.E.N.M.A. Nº 232",
    "empresa": "EE0117273",
    "cue": "140194208",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "LA RIOJA 1450",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0117273"
      }
    ]
  },
  {
    "id": "inst-005",
    "name": "C.E.N.M.A. Nº 70 COMPAÑERO HUGO ESTANISLAO OCHOA",
    "empresa": "EE0110088",
    "cue": "140061800",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "SANTA ROSA 650",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0110088"
      }
    ]
  },
  {
    "id": "inst-006",
    "name": "COLEGIO AMPARO DE MARIA",
    "empresa": "EE1110025",
    "cue": "140397200",
    "levelSource": "1. Común - Primario",
    "sector": "Privado",
    "address": "CASEROS 730",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1110025"
      }
    ]
  },
  {
    "id": "inst-007",
    "name": "COLEGIO DE SAN JOSE (H.H.DOMINICAS)",
    "empresa": "",
    "cue": "",
    "levelSource": "0. Común - Inicial,1. Común - Primario",
    "sector": "Privado",
    "address": "MARIANO MORENO 108",
    "levels": [
      {
        "level": "Inicial",
        "empresa": ""
      },
      {
        "level": "Primario",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-008",
    "name": "COLEGIO EVANGELICO WILLIAM C. MORRIS",
    "empresa": "EE1110024",
    "cue": "140278400",
    "levelSource": "1. Común - Primario",
    "sector": "Privado",
    "address": "SAN JOSE DE CALASANZ 144",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1110024"
      }
    ]
  },
  {
    "id": "inst-009",
    "name": "COLEGIO LA PRIMERA ENSEÑANZA",
    "empresa": "EE1111008",
    "cue": "140283700",
    "levelSource": "1. Común - Primario",
    "sector": "Privado",
    "address": "LA RIOJA 1276",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1111008"
      }
    ]
  },
  {
    "id": "inst-010",
    "name": "COLEGIO MUSICAL COLLEGIUM",
    "empresa": "EE1110093",
    "cue": "140427000",
    "levelSource": "1. Común - Primario",
    "sector": "Privado",
    "address": "CASEROS 963",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1110093"
      }
    ]
  },
  {
    "id": "inst-011",
    "name": "COLEGIO PIO X",
    "empresa": "EE1110035",
    "cue": "140058100",
    "levelSource": "1. Común - Primario",
    "sector": "Privado",
    "address": "9 DE JULIO 1050",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1110035"
      }
    ]
  },
  {
    "id": "inst-012",
    "name": "COLEGIO SANTO TOMAS",
    "empresa": "EE1110041 primario\nEE1510041 inicial",
    "cue": "140397300",
    "levelSource": "0. Común - Inicial,1. Común - Primario",
    "sector": "Privado",
    "address": "CASEROS 745",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE1110041"
      },
      {
        "level": "Inicial",
        "empresa": "EE1510041"
      }
    ]
  },
  {
    "id": "inst-013",
    "name": "DOCTOR EMILIO BAQUERO LAZCANO ANEXO EN ESCUELA SUPERIOR DE COMERCIO MANUEL BELGRANO",
    "empresa": "EE3400008",
    "cue": "140095501",
    "levelSource": "6. Jóvenes y Adultos - Primario",
    "sector": "Estatal",
    "address": "LA RIOJA 1450",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE3400008"
      }
    ]
  },
  {
    "id": "inst-014",
    "name": "ESC. NORMAL SUPERIOR ALEJANDRO CARBO",
    "empresa": "EE0330329 inicial\nEE0330330 primario\nEE0330331 secundario\nEE0330332 superior",
    "cue": "140333800",
    "levelSource": "0. Común - Inicial,1. Común - Primario,2. Común - Secundario,3. Común - Superior",
    "sector": "Estatal",
    "address": "AV COLON 951",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE0330329"
      },
      {
        "level": "Primario",
        "empresa": "EE0330330"
      },
      {
        "level": "Secundario",
        "empresa": "EE0330331"
      },
      {
        "level": "Superior",
        "empresa": "EE0330332"
      }
    ]
  },
  {
    "id": "inst-015",
    "name": "ESCUELA MARIANO MORENO",
    "empresa": "",
    "cue": "",
    "levelSource": "1. Común - Primario",
    "sector": "Estatal",
    "address": "SANTA ROSA 1299",
    "levels": [
      {
        "level": "Primario",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-016",
    "name": "I.P.E.M. Nº 115 DOMINGO FAUSTINO SARMIENTO",
    "empresa": "EE0310540",
    "cue": "140280600",
    "levelSource": "2. Común - Secundario",
    "sector": "Estatal",
    "address": "AV. COLON 1329",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0310540"
      }
    ]
  },
  {
    "id": "inst-017",
    "name": "I.P.E.M. Nº 138 JERONIMO LUIS DE CABRERA",
    "empresa": "EE0310601",
    "cue": "140396900",
    "levelSource": "2. Común - Secundario",
    "sector": "Estatal",
    "address": "SANTA ROSA 650",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0310601"
      }
    ]
  },
  {
    "id": "inst-018",
    "name": "I.P.E.M. Nº 270 GRAL. MANUEL BELGRANO",
    "empresa": "EE0320007",
    "cue": "140333700",
    "levelSource": "2. Común - Secundario",
    "sector": "Estatal",
    "address": "DEAN FUNES 850",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0320007"
      }
    ]
  },
  {
    "id": "inst-019",
    "name": "I.P.E.T. Nº 247 ING. CARLOS CASSAFFOUSTH",
    "empresa": "EE0320014",
    "cue": "140280300",
    "levelSource": "2. Común - Secundario",
    "sector": "Estatal",
    "address": "DEAN FUNES 1511",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0320014"
      }
    ]
  },
  {
    "id": "inst-020",
    "name": "INST. P/ADULTOS WILLIAM C.MORRIS",
    "empresa": "EE1210949",
    "cue": "140280500",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Privado",
    "address": "SAN JOSE DE CALAZANZ 144",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1210949"
      }
    ]
  },
  {
    "id": "inst-021",
    "name": "INST. SUP. COLLEGIUM - CENTRO DE EDUC.E INVEST.MUSICALES",
    "empresa": "EE1310972",
    "cue": "140397000",
    "levelSource": "3. Común - Superior,8. Artística",
    "sector": "Privado",
    "address": "CASEROS 963",
    "levels": [
      {
        "level": "Superior",
        "empresa": ""
      },
      {
        "level": "Artística",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-022",
    "name": "INST. SUP. MARIANO MORENO",
    "empresa": "EE1311024",
    "cue": "140270700",
    "levelSource": "3. Común - Superior",
    "sector": "Privado",
    "address": "LA RIOJA 1019",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE1311024"
      }
    ]
  },
  {
    "id": "inst-023",
    "name": "INST.SECUNDARIO EVANGELICO WILLIAM C. MORRIS",
    "empresa": "EE1210905",
    "cue": "140280400",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "SAN JOSE DE CALASANZ 144",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1210905"
      }
    ]
  },
  {
    "id": "inst-024",
    "name": "INSTITUCION CERVANTES",
    "empresa": "EE1311022",
    "cue": "140443500",
    "levelSource": "3. Común - Superior",
    "sector": "Privado",
    "address": "SANTA ROSA 1793",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE1311022"
      }
    ]
  },
  {
    "id": "inst-025",
    "name": "INSTITUTO DE SAN JOSE (H.H.DOMINICAS)",
    "empresa": "",
    "cue": "",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "MARIANO MORENO 108",
    "levels": [
      {
        "level": "Secundario",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-026",
    "name": "INSTITUTO INTEGRAL MODELO",
    "empresa": "EE1230061",
    "cue": "140270500",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "RODRIGUEZ PEÑA 227",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1230061"
      }
    ]
  },
  {
    "id": "inst-027",
    "name": "INSTITUTO LA PRIMERA ENSEÑANZA",
    "empresa": "EE1211008",
    "cue": "140467900",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "LA RIOJA 1276",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1211008"
      }
    ]
  },
  {
    "id": "inst-028",
    "name": "INSTITUTO MUSICAL COLLEGIUM",
    "empresa": "EE1210972",
    "cue": "140473300",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "CASEROS 963",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1210972"
      }
    ]
  },
  {
    "id": "inst-029",
    "name": "INSTITUTO PIO X",
    "empresa": "EE1230058",
    "cue": "140061700",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "9 DE JULIO 1050",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1230058"
      }
    ]
  },
  {
    "id": "inst-030",
    "name": "INSTITUTO SALESIANO PIO X-NIVEL SUPERIOR-",
    "empresa": "EE1350017",
    "cue": "140342100",
    "levelSource": "3. Común - Superior",
    "sector": "Privado",
    "address": "AV COLON 1051",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE1350017"
      }
    ]
  },
  {
    "id": "inst-031",
    "name": "INSTITUTO SANTO TOMAS",
    "empresa": "EE1230054",
    "cue": "140395200",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "CASEROS 745",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1230054"
      }
    ]
  },
  {
    "id": "inst-032",
    "name": "J.DE INF. AMPARO DE MARIA",
    "empresa": "EE1510025",
    "cue": "140422900",
    "levelSource": "0. Común - Inicial",
    "sector": "Privado",
    "address": "CASEROS 730",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE1510025"
      }
    ]
  },
  {
    "id": "inst-033",
    "name": "J.DE INF. COLLEGIUM",
    "empresa": "EE1510093",
    "cue": "140477100",
    "levelSource": "0. Común - Inicial",
    "sector": "Privado",
    "address": "CASEROS 963",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE1510093"
      }
    ]
  },
  {
    "id": "inst-034",
    "name": "J.DE INF. LA PRIMERA ENSEÑANZA",
    "empresa": "EE1511008",
    "cue": "140565400",
    "levelSource": "0. Común - Inicial",
    "sector": "Privado",
    "address": "LA RIOJA 1276",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE1511008"
      }
    ]
  },
  {
    "id": "inst-035",
    "name": "J.DE INF. MARIANO MORENO",
    "empresa": "",
    "cue": "",
    "levelSource": "0. Común - Inicial",
    "sector": "Estatal",
    "address": "AV. SANTA FE 270",
    "levels": [
      {
        "level": "Inicial",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-036",
    "name": "J.DE INF. PIO X",
    "empresa": "EE1510035",
    "cue": "140575400",
    "levelSource": "0. Común - Inicial",
    "sector": "Privado",
    "address": "9 DE JULIO 1050",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE1510035"
      }
    ]
  },
  {
    "id": "inst-037",
    "name": "JARDIN MUNICIPAL DEODORO",
    "empresa": "EE3500075",
    "cue": "140571500",
    "levelSource": "0. Común - Inicial",
    "sector": "Estatal",
    "address": "ARTIGAS 150",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE3500075"
      }
    ]
  },
  {
    "id": "inst-038",
    "name": "ESCUELA SUP. DE COMERCIO MANUEL BELGRANO",
    "empresa": "",
    "cue": "",
    "levelSource": "1. Común - Primario,2. Común - Secundario,3. Común - Superior",
    "sector": "Estatal",
    "address": "LA RIOJA 1450",
    "levels": [
      {
        "level": "Primario",
        "empresa": ""
      },
      {
        "level": "Secundario",
        "empresa": ""
      },
      {
        "level": "Superior",
        "empresa": ""
      }
    ]
  },
  {
    "id": "inst-039",
    "name": "INSTITUTO TECNICO SUPERIOR CORDOBA",
    "empresa": "EE0310957",
    "cue": "1405441XX",
    "levelSource": "3. Común - Superior",
    "sector": "Estatal",
    "address": "RIO NEGRO 77",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE0310957"
      }
    ]
  },
  {
    "id": "inst-040",
    "name": "J.DE INF. WILLIAN C. MORRIS",
    "empresa": "EE1510024",
    "cue": "140330900",
    "levelSource": "0. Común - Inicial",
    "sector": "Privado",
    "address": "SAN JOSE DE CALASANZ 142",
    "levels": [
      {
        "level": "Inicial",
        "empresa": "EE1510024"
      }
    ]
  },
  {
    "id": "inst-041",
    "name": "C.E.N.M.A. B º S.M.A.T.A. ANEXO SEDE SMATA",
    "empresa": "EE0117015",
    "cue": "140542701",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "27 DE ABRIL 633",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0117015"
      }
    ]
  },
  {
    "id": "inst-042",
    "name": "C.E.N.M.A. DEAN FUNES ANEXO SEDE CONCEJO DELIBERANTE",
    "empresa": "EE0117228",
    "cue": "140511205",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Estatal",
    "address": "PASAJE DE COMERCIO 447",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE0117228"
      }
    ]
  },
  {
    "id": "inst-043",
    "name": "ESCUELA NOCTURNA MERCEDITAS DE SAN MARTIN EXT AULICA CONCEJO DELIBERANTE",
    "empresa": "EE0111752",
    "cue": "140293802",
    "levelSource": "6. Jóvenes y Adultos - Primario",
    "sector": "Estatal",
    "address": "PASAJE DE COMERCIO 447",
    "levels": [
      {
        "level": "Primario",
        "empresa": "EE0111752"
      }
    ]
  },
  {
    "id": "inst-044",
    "name": "INST. C.E.D.(CENTRO DE ESTUDIOS A DISTANCIA)",
    "empresa": "EE1211005",
    "cue": "140470400",
    "levelSource": "7. Jóvenes y Adultos - Secundario",
    "sector": "Privado",
    "address": "INDEPENDENCIA 233",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1211005"
      }
    ]
  },
  {
    "id": "inst-045",
    "name": "INST. SUP. BANCARIO",
    "empresa": "EE1310963",
    "cue": "140489500",
    "levelSource": "3. Común - Superior",
    "sector": "Privado",
    "address": "SAN JERONIMO 224",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE1310963"
      }
    ]
  },
  {
    "id": "inst-046",
    "name": "INSTITUTO AMPARO DE MARIA",
    "empresa": "EE1230017",
    "cue": "140211700",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "CASEROS 730",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1230017"
      }
    ]
  },
  {
    "id": "inst-047",
    "name": "INSTITUTO SECUNDARIO BANCARIO",
    "empresa": "EE1210978",
    "cue": "140518500",
    "levelSource": "2. Común - Secundario",
    "sector": "Privado",
    "address": "SAN JERONIMO 224",
    "levels": [
      {
        "level": "Secundario",
        "empresa": "EE1210978"
      }
    ]
  },
  {
    "id": "inst-048",
    "name": "INSTITUTO SUPERIOR DE FORMACION DOCENTE CALASANZ",
    "empresa": "EE1311016",
    "cue": "140558000",
    "levelSource": "3. Común - Superior",
    "sector": "Privado",
    "address": "CASEROS 745",
    "levels": [
      {
        "level": "Superior",
        "empresa": "EE1311016"
      }
    ]
  },
  {
    "id": "inst-049",
    "name": "INSTITUTO SUPERIOR POLITECNICO CORDOBA",
    "empresa": "EE0310960",
    "cue": "140575200",
    "levelSource": "3. Común - Superior,9. Formación Profesional",
    "sector": "Estatal",
    "address": "AV. HUMBERTO PRIMO 680",
    "levels": [
      {
        "level": "Superior",
        "empresa": ""
      },
      {
        "level": "Formación Profesional",
        "empresa": ""
      }
    ]
  }
]
