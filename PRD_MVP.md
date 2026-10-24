# PluriOne — PRD del MVP

**Versión:** 1.0  
**Estado:** Alcance de entrega académica  
**Producto:** Plataforma de apoyo al reclutamiento

## 1. Resumen

PluriOne es una aplicación web de alcance limitado para organizar vacantes,
recibir CV en PDF, estimar la afinidad semántica entre un CV y una vacante
mediante Google Gemini y consultar indicadores básicos en un Dashboard. El
producto apoya el trabajo de reclutamiento; no automatiza ni formaliza decisiones
de empleo.

## 2. Problema y objetivo

La revisión inicial de postulaciones puede requerir comparar manualmente las
experiencias y habilidades de cada candidato con los requisitos del puesto. El
MVP reúne vacantes y evaluaciones preliminares en un solo flujo para facilitar
esa revisión.

**Objetivo:** entregar un flujo demostrable de administración de vacantes,
evaluación de CV asistida por IA y consulta analítica, manteniendo a una persona
responsable de interpretar el resultado y tomar decisiones.

## 3. Usuarios

- **Reclutador/a:** administra vacantes, revisa postulaciones y consulta
  evaluaciones.
- **Administrador/a del entorno:** configura la base de datos y las variables de
  entorno, incluida la clave de Gemini.

## 4. Alcance funcional incluido

### 4.1 CRUD de vacantes

- Crear una vacante con título, descripción y estado.
- Consultar la lista de vacantes y sus postulaciones.
- Editar los datos de una vacante.
- Eliminar una vacante y sus postulaciones asociadas según las relaciones de
  persistencia definidas por la aplicación.

### 4.2 Recepción y lectura de CV

- Recibir un CV en formato PDF asociado a una vacante.
- Cargar un CV para un candidato y una vacante mediante
  `POST /api/v1/candidatos/{candidato_id}/cv` y `vacante_id`.
- Aceptar archivos de hasta 10 MB.
- Extraer texto del PDF para su evaluación.
- Rechazar archivos que no sean PDFs válidos o que no contengan texto legible.
- No conservar el archivo PDF después de procesarlo.

### 4.3 Evaluación semántica con Google Gemini

- Comparar el texto del CV con la descripción de la vacante.
- Solicitar una respuesta JSON con:
  - `score`: entero de afinidad entre 0 y 100.
  - `justificacion`: explicación breve en español.
- Validar la respuesta antes de devolverla o persistirla.
- Utilizar el evaluador simulado existente si falta `GEMINI_API_KEY`, falla la
  solicitud a Gemini o su respuesta no cumple el formato esperado.
- Tratar el score como referencia y no como una decisión automática de
  contratación.

### 4.4 Dashboard analítico

- Mostrar un resumen visual de reclutamiento, como totales de candidatos y
  vacantes y volumen de postulaciones.
- Mostrar visualizaciones del volumen de postulaciones y del origen de
  candidatos cuando haya datos disponibles.
- Permitir una lectura rápida de la actividad reciente.

Los datos de demostración que se utilicen en la interfaz deben distinguirse
claramente de datos reales.

## 5. Fuera del alcance

Esta entrega **no implementa**:

- Nóminas, pagos, impuestos, beneficios o administración de compensaciones.
- Contratación formal, firma de contratos, generación de ofertas vinculantes ni
  incorporación de empleados.
- Gestión integral de empleados después de su contratación.
- Decisiones automáticas de selección, rechazo o contratación basadas en IA.
- Integraciones de producción con bolsas de empleo externas distintas del
  endpoint de recepción disponible para demostración.
- Almacenamiento permanente, OCR o procesamiento de PDFs escaneados sin texto
  seleccionable.
- Autenticación general de usuarios, roles o permisos de reclutadores.

## 6. Requisitos no funcionales y límites

- La clave de Gemini se proporciona mediante `GEMINI_API_KEY`; nunca se guarda
  en el código fuente ni se expone al frontend.
- Los errores de Gemini deben activar el fallback documentado, sin devolver una
  respuesta con formato inválido.
- La recepción de CV debe limitar el tamaño y validar el tipo de archivo.
- El frontend y la API deben presentar errores comprensibles para problemas de
  entrada o de servicio.
- El sistema es un MVP académico y no debe considerarse un sistema de decisión
  laboral ni una plataforma de nómina o contratación.

## 7. Criterios de aceptación

1. El usuario puede crear, listar, editar y eliminar una vacante desde el flujo
   de la aplicación/API.
2. El endpoint de evaluación de CV acepta un PDF válido de hasta 10 MB y
   devuelve `score` y `justificacion`.
3. Un archivo no PDF, inválido, vacío o superior al límite recibe un error
   controlado.
4. Con `GEMINI_API_KEY` configurada y el servicio disponible, se solicita una
   evaluación semántica a Gemini y se valida la estructura JSON resultante.
5. Sin clave o ante un error de Gemini, se devuelve la evaluación del mecanismo
   simulado de respaldo.
6. El Dashboard muestra métricas y gráficos del proceso; cualquier contenido
   simulado está rotulado como demostración.
7. La aplicación no incluye flujos ni módulos de nómina o contratación formal.

## 8. Indicadores para la demostración

- Vacantes activas y totales registradas.
- Número de candidatos y postulaciones disponibles.
- Proporción de evaluaciones completadas con Gemini frente al fallback, si se
  incorpora telemetría para distinguirlos.
- Tiempo de respuesta de evaluación y porcentaje de PDFs rechazados por formato
  o límite.

## 9. Riesgos y consideraciones

- La evaluación depende de la disponibilidad, cuota y configuración de Google
  Gemini; el fallback permite continuar la demostración, pero no tiene la misma
  calidad semántica.
- La extracción textual no procesa adecuadamente PDFs escaneados como imagen.
- El score de afinidad puede reflejar sesgos o errores del modelo y no debe ser
  el único criterio para valorar a una persona.
- Los CV contienen datos personales. En esta versión, no se conserva el PDF;
  el texto se envía a Gemini para producir la evaluación.

## 10. Fuera de los objetivos de esta entrega

El MVP no pretende sustituir el criterio del equipo de reclutamiento ni cubrir el
ciclo laboral posterior a la selección. Cualquier expansión hacia contratación,
gestión de empleados o nómina requiere un producto, revisión de cumplimiento y
controles específicos fuera de este alcance.
