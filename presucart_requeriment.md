# Proyecto: Aplicación móvil/web para control de presupuesto durante compras

Quiero que actúes como arquitecto de software y desarrollador full-stack senior y construyas una aplicación funcional siguiendo los requisitos descritos a continuación.

## 1. Objetivo

Construir una aplicación sencilla y rápida que permita controlar en tiempo real el presupuesto mientras una persona realiza compras en un supermercado.

El problema principal que debe resolver es evitar que el usuario llegue a la caja y descubra que el monto de los productos supera el presupuesto disponible.

La aplicación debe permitir definir un presupuesto antes de comenzar la compra y, conforme se agregan productos al carrito físico, registrar sus precios y descontarlos automáticamente del presupuesto.

La experiencia durante la compra debe ser extremadamente rápida y requerir la menor cantidad posible de interacciones.

---

# 2. Principio fundamental de UX

La aplicación será utilizada principalmente desde un teléfono mientras el usuario camina por un supermercado.

Por lo tanto:

- Debe funcionar muy bien en dispositivos móviles.
- Los botones deben ser grandes.
- La información importante debe poder entenderse rápidamente.
- Debe requerir pocos pasos.
- El presupuesto disponible debe permanecer visible.
- Debe ser fácil corregir errores.
- El registro de un producto debe tomar pocos segundos.

La prioridad es:

**velocidad > cantidad de funcionalidades.**

No quiero una aplicación financiera compleja en esta primera versión.

---

# 3. Flujo principal

## Paso 1 — Crear una compra

El usuario inicia una nueva compra.

Debe indicar:

- Presupuesto total.
- Nombre del supermercado, opcional.
- Fecha y hora automáticas.

Ejemplo:

Presupuesto: ₡150.000

Supermercado: Walmart

Al comenzar debe mostrarse:

Presupuesto: ₡150.000  
Gastado: ₡0  
Disponible: ₡150.000  
Utilizado: 0%

---

# 4. Modo compra

Esta debe ser la pantalla principal de la aplicación.

Mostrar permanentemente:

- Presupuesto inicial.
- Total acumulado.
- Dinero disponible.
- Porcentaje utilizado.
- Barra visual de progreso.

Ejemplo:

PRESUPUESTO  
₡150.000

GASTADO  
₡87.350

DISPONIBLE  
₡62.650

58% utilizado

La información más importante debe ser el monto disponible.

---

# 5. Captura del precio mediante cámara

La aplicación debe utilizar la cámara del teléfono para reconocer precios de etiquetas del supermercado.

IMPORTANTE:

No quiero que las fotografías sean almacenadas en la galería del teléfono.

La cámara debe funcionar como un escáner.

Flujo:

Cámara
→ frame temporal
→ reconocimiento de texto/OCR
→ detectar posibles precios
→ descartar imagen/frame.

La aplicación debe intentar reconocer formatos como:

₡1.250  
₡4.750  
₡12.950  
1250  
4,750

La moneda inicial será colones costarricenses (CRC).

Debe diseñarse el sistema de manera que posteriormente pueda soportar otras monedas.

---

# 6. Confirmación del precio

Nunca descontar automáticamente un precio simplemente porque la cámara detectó un número.

Siempre debe existir confirmación del usuario.

Ejemplo:

Precio detectado:

₡4.750

Cantidad:

[-] 1 [+]

[ AGREGAR ₡4.750 ]

Si existen varios precios en la etiqueta:

Precio regular: ₡5.250  
Oferta: ₡4.395  
Precio por kg: ₡2.197

Mostrar candidatos:

¿Cuál precio deseas utilizar?

[ ₡5.250 ]

[ ₡4.395 ]

[ ₡2.197 ]

El usuario selecciona uno.

---

# 7. Entrada manual

El reconocimiento mediante cámara nunca debe ser obligatorio.

Debe existir un botón:

"Introducir precio manualmente"

para situaciones donde:

- OCR falle.
- La etiqueta no sea visible.
- El usuario quiera registrar algo rápidamente.

---

# 8. Productos

Quiero comenzar a construir un histórico de productos desde la primera versión.

Un producto debe poder contener:

- ID.
- Nombre.
- Código de barras opcional.
- Categoría opcional.
- Fecha de creación.

No todos estos campos tienen que ser obligatorios durante la compra.

La aplicación nunca debe obligar al usuario a completar mucha información antes de agregar algo al carrito.

---

# 9. Código de barras

El código de barras NO debe utilizarse para determinar el precio.

Su función será identificar consistentemente un producto.

Conceptualmente:

Código de barras
→ Producto

Etiqueta del supermercado
→ Precio actual

Ejemplo:

7441001234567
→
Leche Dos Pinos 1L

Precio detectado:
₡1.350

Esto permitirá construir posteriormente históricos confiables.

---

# 10. Agregar rápidamente

Debe existir la posibilidad de registrar solamente un precio.

Ejemplo:

Precio detectado:

₡3.850

[ AGREGAR RÁPIDO ]

[ IDENTIFICAR PRODUCTO ]

"Agregar rápido" debe permitir continuar inmediatamente con la compra sin identificar el producto.

Esto es importante porque controlar el presupuesto es más importante que registrar perfectamente todos los productos.

---

# 11. Registro de compras

Cada compra debe almacenar:

- ID.
- Fecha.
- Supermercado.
- Presupuesto inicial.
- Total gastado.
- Estado de la compra.

Estados sugeridos:

- activa
- finalizada
- cancelada

---

# 12. Detalle de compra

Cada elemento agregado debe registrar:

- ID.
- Compra.
- Producto opcional.
- Precio unitario.
- Cantidad.
- Subtotal.
- Fecha/hora de registro.

Ejemplo:

Producto: Leche Dos Pinos 1L  
Precio: ₡1.250  
Cantidad: 2  
Subtotal: ₡2.500

El subtotal debe calcularse automáticamente:

subtotal = precio × cantidad

---

# 13. Presupuesto

Cada vez que se agrega, modifica o elimina un elemento, recalcular:

Total gastado = suma de subtotales

Disponible = presupuesto - total gastado

Porcentaje utilizado = total gastado / presupuesto × 100

Nunca depender exclusivamente de un total almacenado si este puede recalcularse desde los detalles de la compra.

---

# 14. Alertas

Mostrar visualmente el estado del presupuesto.

Como referencia:

0%-79%:
Normal.

80%-94%:
Advertencia.

95%-99%:
Alerta importante.

100% o más:
Presupuesto alcanzado o excedido.

Los porcentajes deberían diseñarse para poder configurarse posteriormente.

---

# 15. Deshacer

Después de agregar un producto debe aparecer durante algunos segundos una opción grande:

DESHACER

Esto debe permitir eliminar inmediatamente el último elemento agregado accidentalmente.

También debe existir una pantalla donde puedan editarse o eliminarse elementos registrados.

---

# 16. Finalizar compra

Al terminar, el usuario selecciona:

FINALIZAR COMPRA

Mostrar:

Presupuesto inicial  
Total gastado  
Dinero restante  
Porcentaje utilizado  
Cantidad de artículos registrados

Ejemplo:

Presupuesto: ₡150.000  
Compra: ₡143.850  
Restante: ₡6.150  
Utilizado: 95,9%

Guardar la compra en el histórico.

---

# 17. Histórico

Crear una pantalla sencilla:

Historial de compras

Ejemplo:

03 octubre 2026  
Walmart  
₡143.850

18 septiembre 2026  
Más x Menos  
₡151.300

02 septiembre 2026  
PriceSmart  
₡126.400

Al seleccionar una compra se debe poder consultar su detalle.

---

# 18. Histórico de precios

La estructura de datos debe permitir conocer posteriormente:

Producto → compra → precio → fecha → supermercado.

No es necesario crear análisis avanzados en el MVP.

Pero NO diseñar la base de datos de una manera que impida obtener posteriormente:

- evolución del precio de un producto;
- gasto mensual;
- gasto por supermercado;
- productos más comprados;
- productos que más aumentaron de precio;
- categorías donde más se gasta;
- gasto promedio por compra;
- comparación entre supermercados;
- proyección de futuras compras.

---

# 19. Persistencia

Toda compra debe persistirse.

Si el usuario accidentalmente:

- cierra la aplicación;
- bloquea el teléfono;
- cambia de aplicación;
- pierde temporalmente Internet;

no debería perder una compra activa.

Diseñar pensando en una experiencia tolerante a conexiones inestables.

---

# 20. Arquitectura

Antes de comenzar a implementar:

1. Analiza los requisitos.
2. Propón una arquitectura sencilla.
3. Define frontend, backend y base de datos.
4. Define cómo implementar OCR.
5. Define cómo acceder a la cámara.
6. Define cómo leer códigos de barras.
7. Define el modelo de datos.
8. Explica qué funcionará localmente y qué requerirá servidor.
9. Prioriza tecnologías gratuitas o con planes gratuitos.
10. Evita sobrearquitectura.

Prefiero tecnologías web modernas y ampliamente utilizadas.

La aplicación debe ser responsive y tener una excelente experiencia desde teléfono.

Considera una PWA si resulta apropiada.

---

# 21. Privacidad

Las imágenes utilizadas para detectar precios no deben almacenarse permanentemente.

Si técnicamente es posible, priorizar OCR ejecutado directamente en el dispositivo.

No almacenar imágenes del supermercado salvo que en una versión futura el usuario explícitamente lo autorice.

---

# 22. Base de datos

Diseña como mínimo entidades equivalentes a:

User

Purchase

PurchaseItem

Product

Store

No agregues tablas innecesarias.

Define correctamente relaciones, índices y restricciones.

Los montos monetarios NO deben almacenarse utilizando tipos de punto flotante que puedan introducir errores de precisión.

---

# 23. Alcance del MVP

INCLUIR:

- Crear compra.
- Definir presupuesto.
- Supermercado opcional.
- Escanear precio mediante cámara.
- OCR.
- Confirmar precio.
- Entrada manual.
- Cantidad.
- Agregar rápidamente.
- Producto opcional.
- Código de barras opcional.
- Total acumulado.
- Disponible.
- Barra de progreso.
- Alertas.
- Deshacer.
- Editar/eliminar elementos.
- Finalizar compra.
- Persistencia.
- Histórico de compras.
- Base de datos preparada para histórico de precios.

NO INCLUIR todavía:

- Comparación automática entre supermercados.
- Inteligencia artificial para recomendaciones.
- Predicción de gastos.
- Integraciones bancarias.
- Tarjetas de crédito.
- Facturación.
- Programas de puntos.
- Listas familiares compartidas.
- Paneles analíticos complejos.

Preparar la arquitectura para que algunas de estas funcionalidades puedan agregarse posteriormente sin complicar el MVP.

---

# 24. Desarrollo incremental

No construyas toda la aplicación de una sola vez.

Divide la implementación en etapas funcionales pequeñas.

Sugiero aproximadamente:

FASE 1  
Proyecto base + base de datos + modelo de datos.

FASE 2  
Crear compra + presupuesto + agregar precios manualmente.

FASE 3  
Modo compra + cálculo en tiempo real + editar/eliminar/deshacer.

FASE 4  
Cámara + OCR de precios.

FASE 5  
Productos + lectura opcional de código de barras.

FASE 6  
Finalizar compra + histórico.

FASE 7  
PWA + persistencia/offline + mejoras UX.

FASE 8  
Pruebas, validaciones y preparación para producción.

Cada fase debe dejar una aplicación funcional y verificable.

No avances ciegamente si una funcionalidad fundamental de una fase anterior no funciona.

---

# 25. Pruebas importantes

Crear pruebas para cálculos críticos.

Ejemplos:

Presupuesto = ₡150.000  
Producto = ₡5.000 × 2

Resultado esperado:

Gastado = ₡10.000  
Disponible = ₡140.000

Si posteriormente se elimina una unidad:

Gastado = ₡5.000  
Disponible = ₡145.000

También probar:

- presupuesto exactamente alcanzado;
- presupuesto excedido;
- cantidades mayores que uno;
- eliminar producto;
- modificar precio;
- modificar cantidad;
- OCR devuelve múltiples números;
- OCR no reconoce precio;
- cierre accidental durante compra;
- valores inválidos.

---

# 26. Criterio principal de éxito

Una persona debe poder entrar a un supermercado, iniciar una compra y controlar su presupuesto mientras agrega productos sin que utilizar la aplicación se convierta en una carga.

Idealmente:

Apuntar cámara
→ detectar precio
→ confirmar
→ continuar comprando.

El monto disponible debe actualizarse inmediatamente.

La funcionalidad más importante de toda la aplicación es:

**"Sé exactamente cuánto dinero me queda disponible antes de llegar a la caja."**

La segunda prioridad es:

**"Estoy construyendo un histórico útil de mis compras sin hacer significativamente más lento el proceso."**

---

# 27. Primera tarea

NO empieces escribiendo todo el código inmediatamente.

Primero entrégame:

1. Resumen de cómo entendiste el problema.
2. Arquitectura propuesta.
3. Stack tecnológico recomendado y justificación.
4. Estrategia para cámara y OCR en dispositivos móviles.
5. Estrategia para lectura de códigos de barras.
6. Modelo de datos propuesto.
7. Diagrama conceptual de entidades y relaciones.
8. Estructura inicial del proyecto.
9. Plan incremental de implementación.
10. Riesgos técnicos principales, especialmente relacionados con OCR.
11. Qué funcionalidades podrían funcionar offline.
12. Qué decisiones debemos tomar antes de comenzar.

Prioriza simplicidad, velocidad de uso, bajo costo y facilidad de mantenimiento.

Después de presentar esta propuesta, espera mi aprobación antes de comenzar la implementación.