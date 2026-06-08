# Sistema de gamificación: logros de usuario

## Descripción del ejercicio

Se ha desarrollado un sistema de gamificación basado en logros para la webApp de Trip2Guide. El objetivo es premiar determinadas acciones realizadas por los usuarios y ofrecer una experiencia más interactiva mediante la visualización de logros desbloqueados.

## Estado actual del proyecto

### Funcionalidades implementadas

#### Backend

Se ha implementado la gestión de logros mediante nuevos componentes en el backend:

- Creación de los modelos necesarios para almacenar los logros y los logros desbloqueados por cada usuario.
- Implementación de la lógica de evaluación de logros.
- Creación del endpoint para consultar los logros del usuario autenticado.
- Integración de las rutas de logros dentro del servidor.

Actualmente se encuentran implementados los siguientes logros:

- Primera ruta creada.
- Cinco rutas creadas.
- Primera ruta añadida a favoritos.
- Diez rutas añadidas a favoritos.

#### Frontend

Se ha implementado una nueva sección de logros dentro de la página de perfil del usuario.

Las funcionalidades desarrolladas son:

- Consulta de los logros del usuario mediante el endpoint del backend.
- Visualización de los logros desbloqueados.
- Visualización opcional de todos los logros disponibles mediante el botón "Ver todos".
- Diferenciación visual entre logros desbloqueados y bloqueados.
- Visualización del detalle de un logro al seleccionarlo.
- Cierre del detalle al volver a seleccionar el mismo logro.
- Indicador visual mediante un punto rojo en el menú de usuario cuando existen logros nuevos pendientes de revisar.
- Marcado de logros como revisados una vez consultados por el usuario, para que el punto rojo desaparezca.

### Funcionalidades operativas

Actualmente el sistema permite:

- Desbloquear logros automáticamente.
- Consultar los logros desde el perfil.
- Ver los detalles de cada logro.
- Consultar tanto los logros desbloqueados como los bloqueados.
- Recibir una notificapción visual cuando existe un nuevo logro.
