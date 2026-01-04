# Solución: Error "No registered origin" (Error 401)

Este error confirma que **Google Cloud Console** no tiene registrada la URL desde donde intentas conectarte (`http://localhost:3000`).

### Paso 1: Ir a Google Cloud Console
1. Ingresa a [console.cloud.google.com](https://console.cloud.google.com/apis/credentials).
2. Ve a la sección **APIs & Services** > **Credentials**.
3. Haz clic en el nombre de tu **OAuth 2.0 Client ID** (el que estás usando en el proyecto).

### Paso 2: Agregar Orígenes de JavaScript (¡CRÍTICO!)
Busca la sección **"Authorized JavaScript origins"** (Orígenes de JavaScript autorizados).
Agrega estas **dos** URIs exactas (sin barras al final):

1. `http://localhost:3000`
2. `http://localhost`

> **Nota:** Google a veces es caprichoso con el puerto 3000 o "localhost" a secas. Agregar ambos asegura que funcione.

**¡GUARDA LOS CAMBIOS!**

### Paso 3: Esperar (Importante)
Google dice que puede tardar, pero usualmente en **5 minutos** ya funciona. Si sigue fallando, prueba abrir una **ventana de incógnito** para limpiar la caché del navegador.

### Paso 4: Verificar Whitelist (Base de Datos)
Veo en tu captura que tu correo es `carlosacostap@gmail.com`.
Asegúrate de ejecutar esto en el **SQL Editor** de Supabase para darte permisos, o te dará otro error después de arreglar el de Google:

```sql
insert into public.whitelist (email, role)
values ('carlosacostap@gmail.com', 'admin-plataforma');
```
