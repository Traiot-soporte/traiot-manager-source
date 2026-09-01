export interface DeviceSalesProfile {
  readonly sequence: number
  readonly model: string
  readonly brand: string
  readonly segment: string
  readonly competitor1: string
  readonly competitor2: string
  readonly competitionLevel: string
  readonly differentialValue: string
  readonly mainStrength: string
  readonly capabilities: string
  readonly whyBetter: string
  readonly commercialCaution: string
  readonly salesArgument: string
  readonly sourceUrl: string
}

/**
 * Matriz comercial curada a partir del archivo comparativo proporcionado por TRAIOT.
 * La ficha tecnica sigue viviendo en el registro; este catalogo aporta la narrativa
 * competitiva que necesita el equipo comercial.
 */
export const deviceSalesProfiles = [
  {
    "sequence": 1,
    "model": "PioneerX 100",
    "brand": "TOPFLYtech",
    "segment": "GPS cableado básico 4G + BLE + I/O",
    "competitor1": "Teltonika FMC920",
    "competitor2": "Queclink GV57MG",
    "competitionLevel": "Directa",
    "differentialValue": "🟢",
    "mainStrength": "Muy competitivo en costo/funcionalidad",
    "capabilities": "4G Cat 1 + 2G, BLE, 2 DOUT, SOS, ACC, WiFi Scan, MQTT, jamming, memoria de posiciones e IP67 opcional.",
    "whyBetter": "Permite comenzar con rastreo básico y crecer con sensores BLE, pánico y bloqueo sin cambiar de rastreador.",
    "commercialCaution": "El FMC920 tiene un ecosistema y soporte de mercado muy amplio; la ventaja depende de precio, periféricos y proyecto.",
    "salesArgument": "Ideal para flotillas ligeras y despliegues masivos con posibilidad de expansión.",
    "sourceUrl": "https://www.topflytech.com/es/pioneerx-100-4g-cat-1/"
  },
  {
    "sequence": 2,
    "model": "PioneerX 101",
    "brand": "TOPFLYtech",
    "segment": "GPS cableado robusto / alto voltaje",
    "competitor1": "Teltonika FMC130",
    "competitor2": "Queclink GV310LAU",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Multivoltaje e instalación industrial",
    "capabilities": "Alimentación 7–100 V, IP67, BLE 5.0 e integración de accesorios.",
    "whyBetter": "Puede utilizarse en autos, camiones, montacargas, maquinaria y equipos industriales; reduce la necesidad de manejar varios modelos por voltaje.",
    "commercialCaution": "Los competidores cuentan con ecosistemas maduros de CAN/I/O; validar la interfaz requerida en cada instalación.",
    "salesArgument": "Muy fuerte para maquinaria, transporte pesado y unidades con voltajes no convencionales.",
    "sourceUrl": "https://www.topflytech.com/es/pioneerx-101-4g-cat-1/"
  },
  {
    "sequence": 3,
    "model": "HeroX 100",
    "brand": "TOPFLYtech",
    "segment": "Telemática avanzada / CAN / periféricos / PTT",
    "competitor1": "Teltonika FMC650",
    "competitor2": "Queclink GV350CEU",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "Integración avanzada + audio/PTT",
    "capabilities": "Múltiples E/S, RS485, 1-Wire, CAN/FMS, BLE, MicroSD opcional, audio bidireccional y Push-to-Talk.",
    "whyBetter": "Un solo dispositivo puede cubrir rastreo, CAN, combustible, temperatura, pánico, paro de motor, identificación y comunicación con operador.",
    "commercialCaution": "FMC650 y GV350CEU son competidores de gama alta muy sólidos; la ventaja principal está en la integración PTT/audio y ecosistema de accesorios.",
    "salesArgument": "Producto destacado para transporte, seguridad y telemetría avanzada.",
    "sourceUrl": "https://www.topflytech.com/es/herox-100-4g-cat-1/"
  },
  {
    "sequence": 4,
    "model": "TLW2-2BL",
    "brand": "TOPFLYtech",
    "segment": "GPS cableado LTE-M básico",
    "competitor1": "Teltonika FMM920",
    "competitor2": "Queclink GV57MG",
    "competitionLevel": "Directa",
    "differentialValue": "🟢",
    "mainStrength": "Simplicidad + BLE + voltaje",
    "capabilities": "7–60 V, IP65, BLE 5.0, 1 DIN y 1 DOUT en formato compacto.",
    "whyBetter": "Entrega las interfaces esenciales sin pagar por hardware que el proyecto no utilizará y permite agregar sensores BLE.",
    "commercialCaution": "Menor cantidad de I/O que equipos intermedios; se debe elegir para proyectos simples y bien definidos.",
    "salesArgument": "Bueno para rastreo básico, ACC, bloqueo y sensores BLE.",
    "sourceUrl": "https://www.topflytech.com/es/tlw2-2bl-4g-lte/"
  },
  {
    "sequence": 5,
    "model": "TLW2-6BL",
    "brand": "TOPFLYtech",
    "segment": "GPS cableado intermedio",
    "competitor1": "Teltonika FMM130",
    "competitor2": "Queclink GV310LAU",
    "competitionLevel": "Directa",
    "differentialValue": "🟢",
    "mainStrength": "Buena relación I/O / tamaño / costo",
    "capabilities": "2 DIN, 1 DOUT, entrada configurable digital/analógica, BLE 5.0, IP65 y 7–60 V.",
    "whyBetter": "Cubre pánico, ignición, una salida y una señal analógica sin subir a un equipo de gama alta.",
    "commercialCaution": "Los competidores pueden ofrecer mayor profundidad en periféricos/CAN según variante.",
    "salesArgument": "Muy equilibrado para flotillas que necesitan unas cuantas señales adicionales.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 6,
    "model": "TLW2-12BL",
    "brand": "TOPFLYtech",
    "segment": "GPS cableado avanzado / múltiples I/O",
    "competitor1": "Teltonika FMC130",
    "competitor2": "Queclink GV350CEU",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Flexibilidad de conexiones y BLE",
    "capabilities": "Múltiples entradas/salidas y soporte de periféricos con ecosistema BLE TOPFLYtech.",
    "whyBetter": "Permite concentrar pánico, bloqueo, puertas, sensores y otras señales en un solo equipo.",
    "commercialCaution": "Si el proyecto requiere CAN/FMS avanzado, puede ser más conveniente HeroX 100 u otro modelo de gama superior.",
    "salesArgument": "Fuerte cuando la cantidad de señales físicas es más importante que CAN avanzado.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 7,
    "model": "TLW2-12B",
    "brand": "TOPFLYtech",
    "segment": "Tracker cableado con gran batería para remolques",
    "competitor1": "Teltonika FMC234 / FMC130",
    "competitor2": "Queclink GV600MG",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "Batería interna de 9,600 mAh + I/O",
    "capabilities": "Batería 9,600 mAh, IP67, 3 DIN, 3 DOUT, 3 entradas configurables, salida 5/12 V, BLE, detección de remoción y gran memoria.",
    "whyBetter": "Trabaja conectado al tractocamión y continúa reportando de forma autónoma cuando el remolque se desengancha.",
    "commercialCaution": "Es más grande y especializado que un tracker básico; su valor aparece en remolques y activos que pasan periodos sin alimentación.",
    "salesArgument": "Uno de los mejores argumentos del portafolio para remolques y cajas.",
    "sourceUrl": "https://www.topflytech.com/es/tlw2-12b-4g-lte/"
  },
  {
    "sequence": 8,
    "model": "TorchX 100",
    "brand": "TOPFLYtech",
    "segment": "OBD 4G plug-and-play",
    "competitor1": "Teltonika FMC003",
    "competitor2": "Queclink GV500MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢",
    "mainStrength": "Instalación rápida + BLE",
    "capabilities": "Formato OBD, instalación no invasiva, rastreo, datos vehiculares y posibilidad de sensores BLE.",
    "whyBetter": "Reduce tiempos de instalación y permite una solución homogénea con otros periféricos TOPFLYtech.",
    "commercialCaution": "FMC003 es muy fuerte en profundidad OBD/OEM; no vender la ventaja únicamente por cantidad de PIDs.",
    "salesArgument": "Ideal para flotas ligeras que priorizan instalación rápida.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 9,
    "model": "TLD2-L",
    "brand": "TOPFLYtech",
    "segment": "OBD LTE-M / NB-IoT",
    "competitor1": "Teltonika FMM003",
    "competitor2": "Queclink GV500MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Red IoT + BLE + buzzer",
    "capabilities": "LTE-M + NB-IoT + 2G, BLE, batería interna y buzzer.",
    "whyBetter": "Puede enviar información a plataforma y alertar localmente al conductor con el buzzer, útil para eventos de manejo.",
    "commercialCaution": "Validar cobertura LTE-M/NB-IoT por operador y país.",
    "salesArgument": "Fuerte para IoT vehicular de bajo consumo y alertamiento al conductor.",
    "sourceUrl": "https://www.topflytech.com/es/tld2-l-4g-lte/"
  },
  {
    "sequence": 10,
    "model": "TLD2-D",
    "brand": "TOPFLYtech",
    "segment": "OBD con lectura CAN",
    "competitor1": "Teltonika FMC003",
    "competitor2": "Queclink GV500MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢",
    "mainStrength": "OBD/CAN + BLE + buzzer",
    "capabilities": "Lectura CAN/OBD ISO 15765-4, BLE 5.0, buzzer y formato compacto.",
    "whyBetter": "Buena telemetría sin cortar cables, con opción de interacción local mediante buzzer.",
    "commercialCaution": "Teltonika FMC003 tiene una cobertura OEM/OBD muy amplia; conviene competir en simplicidad, costo y ecosistema BLE.",
    "salesArgument": "Adecuado para vehículos ligeros con lectura CAN estándar.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 11,
    "model": "KnightX 100",
    "brand": "TOPFLYtech",
    "segment": "Asset tracker recargable",
    "competitor1": "Teltonika TAT240",
    "competitor2": "Queclink GL520MG",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Recargable + montaje magnético + SOS",
    "capabilities": "Batería recargable, montaje magnético, botón de pánico y opción de sonda de temperatura.",
    "whyBetter": "Muy práctico para activos que regresan periódicamente a base y necesitan recarga, pánico o temperatura.",
    "commercialCaution": "No está pensado para la autonomía extrema de trackers LiSOCl2 de varios años.",
    "salesArgument": "Bueno para activos móviles, seguridad temporal y cargas reutilizables.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 12,
    "model": "SolarX 310",
    "brand": "TOPFLYtech",
    "segment": "Rastreador solar de activos",
    "competitor1": "Meitrack TA255",
    "competitor2": "CalAmp TTU-2900MB",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Menor mantenimiento por energía solar",
    "capabilities": "Operación autónoma mediante carga solar para remolques, contenedores y maquinaria.",
    "whyBetter": "Reduce visitas de mantenimiento y cambios de batería durante la vida del proyecto.",
    "commercialCaution": "La comparación debe realizarse por TCO, batería, panel, reportes y cobertura; no sólo por precio inicial.",
    "salesArgument": "Muy fuerte en activos que pasan largos periodos sin alimentación externa.",
    "sourceUrl": "https://www.topflytech.com/es/solarpoweredgps/"
  },
  {
    "sequence": 13,
    "model": "TLP2-SFB",
    "brand": "TOPFLYtech",
    "segment": "Rastreador solar para remolques/activos",
    "competitor1": "Meitrack TA255",
    "competitor2": "CalAmp TTU-2900MB",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Autonomía solar + reducción de mantenimiento",
    "capabilities": "Combina rastreo de activo con carga solar y operación prolongada.",
    "whyBetter": "En flotas grandes y dispersas puede reducir considerablemente visitas de mantenimiento de batería.",
    "commercialCaution": "Validar autonomía real de acuerdo con intervalo de reporte, exposición solar y cobertura celular.",
    "salesArgument": "Buen argumento de costo total de operación.",
    "sourceUrl": "https://www.topflytech.com/es/"
  },
  {
    "sequence": 14,
    "model": "SolarGuardX 100",
    "brand": "TOPFLYtech",
    "segment": "GPS E-Lock solar",
    "competitor1": "Jointech JT709C",
    "competitor2": "Jimi IoT LL302",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "GPS + candado electrónico + solar",
    "capabilities": "Rastreo, E-Lock, detección de corte/manipulación, apertura controlada y energía solar.",
    "whyBetter": "Sustituye la combinación de GPS separado + candado electrónico y agrega eventos de seguridad en la misma solución.",
    "commercialCaution": "Es un producto especializado; costo y operación deben compararse contra soluciones E-lock, no contra GPS simples.",
    "salesArgument": "Excelente para contenedores, carga de alto valor y cadena de custodia.",
    "sourceUrl": "https://www.topflytech.com/es/solarguardx-100-4g-lte-es/"
  },
  {
    "sequence": 15,
    "model": "SolarGuardX 200",
    "brand": "TOPFLYtech",
    "segment": "GPS E-Lock industrial / cadena de custodia",
    "competitor1": "Jointech JT709C",
    "competitor2": "Jimi IoT LL302",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "Cadena de custodia + múltiples métodos de apertura",
    "capabilities": "Solar, apertura remota, RFID, BLE, red/SMS y alarma por corte de cable.",
    "whyBetter": "Permite controlar quién abrió, cuándo y dónde, además de rastrear la ubicación del contenedor.",
    "commercialCaution": "Requiere proceso operativo y plataforma correctamente configurados para aprovechar su valor.",
    "salesArgument": "Muy fuerte en logística internacional, aduanas y contenedores.",
    "sourceUrl": "https://www.topflytech.com/es/solarguardx-200-es/"
  },
  {
    "sequence": 16,
    "model": "Pro5S",
    "brand": "Ruptela",
    "segment": "Telemática avanzada / CAN / LATAM",
    "competitor1": "Teltonika FMC650",
    "competitor2": "Queclink GV350CEU",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "CustomCAN + 2 CAN + K-Line + audio",
    "capabilities": "4G + 3G, audio, 2×CAN, K-Line, OBD, CustomCAN y BLE 5.1; gran cobertura vehicular.",
    "whyBetter": "Muy fuerte en flotas heterogéneas, maquinaria y proyectos donde los parámetros CAN no son estándar.",
    "commercialCaution": "Los competidores tienen ecosistemas amplios; la ventaja depende del perfil CAN disponible y capacidad de ingeniería.",
    "salesArgument": "Uno de los mejores equipos para integración CAN avanzada en LATAM.",
    "sourceUrl": "https://ruptela.com/product/pro5s/"
  },
  {
    "sequence": 17,
    "model": "Eco5 IP68",
    "brand": "Ruptela",
    "segment": "GPS robusto para exterior",
    "competitor1": "Teltonika FMC230",
    "competitor2": "Queclink GV75MG",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "IP68 + variantes de red + múltiples hilos",
    "capabilities": "Carcasa IP68 y variantes LTE Cat 1 / Cat M1 / NB2, con configuraciones de múltiples hilos.",
    "whyBetter": "Ideal para instalar fuera de cabina, maquinaria o ambientes con polvo y agua manteniendo la familia Ruptela.",
    "commercialCaution": "Comparar cuidadosamente cantidad de I/O y batería según variante exacta.",
    "salesArgument": "Fuerte para instalaciones severas y exteriores.",
    "sourceUrl": "https://ruptela.mx/producto/eco5/"
  },
  {
    "sequence": 18,
    "model": "Eco5 Lite",
    "brand": "Ruptela",
    "segment": "GPS cableado compacto básico",
    "competitor1": "Teltonika FMC920",
    "competitor2": "Queclink GV57MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢",
    "mainStrength": "Bajo consumo + BLE + flexibilidad",
    "capabilities": "BLE 5.0, DIN, AIN/DIN, DOUT y consumo profundo menor a 0.5 mA en un formato compacto.",
    "whyBetter": "Excelente para despliegues masivos donde se busca equilibrio entre costo, consumo y funciones esenciales.",
    "commercialCaution": "No busca competir con equipos CAN avanzados; su fortaleza es costo/volumen.",
    "salesArgument": "Muy adecuado para grandes flotillas de rastreo convencional.",
    "sourceUrl": "https://ruptela.mx/producto/eco5-lite/"
  },
  {
    "sequence": 19,
    "model": "ECO5 12W",
    "brand": "Ruptela",
    "segment": "GPS multipropósito con más cableado",
    "competitor1": "Teltonika FMC130",
    "competitor2": "Queclink GV310LAU",
    "competitionLevel": "Directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "12 hilos + variedad de variantes",
    "capabilities": "La versión de 12 hilos permite más señales y existe en diferentes variantes celulares y carcasa IP68.",
    "whyBetter": "Puede estandarizar una misma familia de hardware/protocolo en distintos proyectos manteniendo flexibilidad de instalación.",
    "commercialCaution": "La ventaja depende de la variante exacta comprada; documentar SKU y red antes de ofertar.",
    "salesArgument": "Fuerte para estandarización de flota con diferentes necesidades de I/O.",
    "sourceUrl": "https://ruptela.mx/producto/eco5/"
  },
  {
    "sequence": 20,
    "model": "SMART5",
    "brand": "Ruptela",
    "segment": "GPS + CAN/OBD multipropósito",
    "competitor1": "Teltonika FMC150",
    "competitor2": "Queclink GV350CEU",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "CustomCAN + amplio rango de aplicaciones",
    "capabilities": "CAN/OBD, CustomCAN, BLE 5.0, 1-Wire, I/O e IP68 opcional.",
    "whyBetter": "Una misma familia puede cubrir auto, van, camión, remolque y maquinaria, reduciendo el número de modelos a administrar.",
    "commercialCaution": "La integración CAN debe validarse por vehículo; los competidores también tienen bases de datos OEM fuertes.",
    "salesArgument": "Excelente para estandarizar flotas mixtas.",
    "sourceUrl": "https://ruptela.mx/producto/smart5/"
  },
  {
    "sequence": 21,
    "model": "PRO5 LITE",
    "brand": "Ruptela",
    "segment": "GPS CAN avanzado / periféricos",
    "competitor1": "Teltonika FMC650",
    "competitor2": "Queclink GV350CEU",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "CustomCAN + periféricos + flexibilidad",
    "capabilities": "Orientado a CAN, sensores, identificación de conductor y múltiples periféricos dentro del ecosistema Ruptela.",
    "whyBetter": "Muy valioso cuando aparecen vehículos, remolques o maquinaria no estándar y se requiere adaptar parámetros CAN.",
    "commercialCaution": "FMC650 ofrece capacidades avanzadas y gran ecosistema; el valor Ruptela aumenta cuando CustomCAN resuelve un caso específico.",
    "salesArgument": "Fuerte para ingeniería de telemetría y proyectos personalizados.",
    "sourceUrl": "https://ruptela.com/"
  },
  {
    "sequence": 22,
    "model": "HCV5 BLE",
    "brand": "Ruptela",
    "segment": "Heavy Commercial Vehicle / J1939-FMS",
    "competitor1": "Teltonika FMC650",
    "competitor2": "Queclink GV600MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "Especialización en vehículo pesado",
    "capabilities": "Enfoque HCV con CAN/FMS/J1939, BLE y ecosistema para camión, bus, tacógrafo, remolque y combustible.",
    "whyBetter": "Más específico para transporte pesado que un tracker vehicular genérico, facilitando proyectos de CAN/FMS y logística.",
    "commercialCaution": "Validar versiones de tacógrafo/FMS y periféricos requeridos; el FMC650 también es muy fuerte en transporte pesado.",
    "salesArgument": "Muy recomendable para tractocamiones, autobuses y transporte de carga.",
    "sourceUrl": "https://ruptela.com/"
  },
  {
    "sequence": 23,
    "model": "Plug5",
    "brand": "Ruptela",
    "segment": "OBD/CAN plug-and-play",
    "competitor1": "Teltonika FMC003",
    "competitor2": "Queclink GV500MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Instalación OBD + ecosistema CAN Ruptela",
    "capabilities": "Instalación directa en OBD y acceso a telemetría vehicular con la plataforma/configuración Ruptela.",
    "whyBetter": "Permite extraer datos sin instalación invasiva y mantener la misma lógica de configuración que otros equipos Ruptela.",
    "commercialCaution": "Competidores tienen cobertura OBD muy amplia; confirmar parámetros disponibles para cada marca/modelo/año.",
    "salesArgument": "Ideal para flota ligera, renta y proyectos de rápida instalación.",
    "sourceUrl": "https://ruptela.com/"
  },
  {
    "sequence": 24,
    "model": "Asset5",
    "brand": "Ruptela",
    "segment": "Asset tracker autónomo",
    "competitor1": "Teltonika TAT240",
    "competitor2": "Queclink GL520MG",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "BLE 6.0 + IP68 + baterías reemplazables",
    "capabilities": "Cat 1bis/Cat M1 según variante, BLE 6.0, IP68, 2 baterías AA LiSOCl2 reemplazables, botón y tamper.",
    "whyBetter": "Compacto, ocultable y mantenible: permite cambiar baterías en vez de desechar todo el equipo.",
    "commercialCaution": "La autonomía depende fuertemente del intervalo de reporte y cobertura; comparar escenarios iguales.",
    "salesArgument": "Muy fuerte para renta, leasing, maquinaria y rastreo de respaldo.",
    "sourceUrl": "https://ruptela.com/product/asset5/"
  },
  {
    "sequence": 25,
    "model": "TD-BLE",
    "brand": "Escort / familia sensor",
    "segment": "Sensor BLE de nivel de combustible",
    "competitor1": "Technoton DUT-E S7",
    "competitor2": "Escort TD-BLE / equivalentes BLE",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Sin cable de comunicación",
    "capabilities": "Transmisión BLE del nivel de combustible, simplificando cableado entre tanque y rastreador.",
    "whyBetter": "Reduce tiempo de instalación y puntos de falla y permite ubicar el sensor donde el cableado de datos es incómodo.",
    "commercialCaution": "La batería, alcance BLE y compatibilidad con el tracker deben verificarse en cada proyecto.",
    "salesArgument": "Muy útil para tanques, remolques y maquinaria donde se busca instalación limpia.",
    "sourceUrl": "https://escortsensors.com/product/escort-wireless-fuel-level-sensor-td-ble/"
  },
  {
    "sequence": 26,
    "model": "LLS 6 AI",
    "brand": "Omnicomm",
    "segment": "Sensor capacitivo premium con IA",
    "competitor1": "Technoton DUT-E",
    "competitor2": "Escort TD-600",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "IA integrada + FuelScan + precisión",
    "capabilities": "Procesamiento inteligente dentro del sensor para filtrar oscilaciones y reconocer eventos, además de FuelScan y RS485 protegido.",
    "whyBetter": "Entrega datos más limpios desde el origen y puede reducir falsos eventos de carga/descarga antes de llegar a la plataforma.",
    "commercialCaution": "El valor premium debe justificarse con precisión y reducción de falsas alarmas; requiere calibración e instalación profesional.",
    "salesArgument": "Producto de alto valor para control de combustible exigente.",
    "sourceUrl": "https://omnicomm-world.com/products/hardware/fuel-level-sensors/lls-6-ai/"
  },
  {
    "sequence": 27,
    "model": "LLS5",
    "brand": "Omnicomm",
    "segment": "Sensor capacitivo premium cableado",
    "competitor1": "Technoton DUT-E",
    "competitor2": "Escort TD-600",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢🟢",
    "mainStrength": "FuelScan + protección industrial + precisión",
    "capabilities": "±0.5% declarado, IP69K, 7–75 V, RS232/RS485, aislamiento galvánico y FuelScan.",
    "whyBetter": "Muy robusto frente a cambios de combustible, ambientes severos y perturbaciones eléctricas; orientado a operación profesional.",
    "commercialCaution": "Su precio e instalación pueden ser mayores que opciones básicas; se justifica en flotas donde el combustible es crítico.",
    "salesArgument": "Excelente para maquinaria, tractocamiones y control antifraude.",
    "sourceUrl": "https://omnicomm-world.com/es/nivel-profesional/hardware/sensores-de-nivel-de-combustible/lls-5/"
  },
  {
    "sequence": 28,
    "model": "WarriorX 100",
    "brand": "TOPFLYtech",
    "segment": "Asset tracker autónomo IP67",
    "competitor1": "Teltonika TAT240",
    "competitor2": "Digital Matter Oyster3 Global",
    "competitionLevel": "Muy directa",
    "differentialValue": "🟢🟢",
    "mainStrength": "Cat 1 + 2G + recuperación / temperatura",
    "capabilities": "Cat 1 + 2G, GNSS multiconstelación, WiFi/LBS, temperatura, alerta de remoción, 4,000/8,000 mAh y varios años de autonomía según configuración.",
    "whyBetter": "Puede ser muy atractivo donde Cat 1/2G tenga mejor disponibilidad y se valoren temperatura, remoción y recuperación por robo.",
    "commercialCaution": "Oyster3 puede superar claramente en autonomía e IP; no competir sólo por años de batería.",
    "salesArgument": "Fuerte por cobertura celular, seguridad y equilibrio costo/función.",
    "sourceUrl": "https://www.topflytech.com/es/warriorx-100-4g-cat-1/"
  }
] as const satisfies readonly DeviceSalesProfile[]

const profilesByModel = new Map(
  deviceSalesProfiles.map((profile) => [normalizeDeviceModel(profile.model), profile]),
)

export function findDeviceSalesProfile(model: unknown): DeviceSalesProfile | undefined {
  return profilesByModel.get(normalizeDeviceModel(model))
}

export function normalizeDeviceModel(value: unknown): string {
  const normalizedValue = typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''

  return normalizedValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLocaleUpperCase('es-MX')
}
