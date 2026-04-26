---
name: registrar-decision
description: Registrar una decisión técnica o de diseño en DECISIONES-TECNICAS.md. Usar cuando se toma cualquier decisión no trivial sobre stack, arquitectura, gameplay o mundo.
---

Se recibe la descripción de la decisión a registrar (puede venir como argumento del skill o como contexto de la conversación).

Pasos:

1. Leer DECISIONES-TECNICAS.md completo
2. Determinar en qué sección corresponde la decisión:
   - **Stack**: cambios o elecciones de herramientas, librerías, versiones
   - **Arquitectura**: patrones, estructuras de código, comunicación entre sistemas
   - **Gameplay**: mecánicas de juego, sistemas de reglas, feedback al jugador
   - **Mundo / Zonas**: posicionamiento, geometría, iluminación de zonas
   - **Pendientes / En evaluación**: decisiones postergadas o bajo análisis
3. Redactar la entrada con este formato:

```
### [FECHA] Título breve de la decisión
**Contexto:** por qué había que tomar esta decisión.
**Decisión:** qué se eligió y cómo se implementó.
**Alternativas descartadas:** qué no se eligió y por qué.
**Consecuencias:** qué implica esta decisión para el resto del proyecto.
```

   - Usar la fecha de `currentDate` del contexto del sistema (formato YYYY-MM-DD)
   - Si se actualizan decisiones previas (ej. tabla de eventos), editar la entrada existente en lugar de duplicar
   - Si la decisión aún no está resuelta, agregarla en "Pendientes / En evaluación" como bullet

4. Escribir el archivo actualizado con Edit (no Write completo a menos que sea necesario)
5. Confirmar qué entrada se agregó o modificó
