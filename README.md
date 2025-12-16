# 🥦 VerdurasBot (AI Order Assistant)

**Asistente de ventas automatizado con IA para pedidos de fruver por WhatsApp.**

Este prototipo lleva la experiencia de compra ("Conversational Commerce") al siguiente nivel. A diferencia de los bots tradicionales de menús numéricos, este sistema utiliza **Inteligencia Artificial Generativa** para entender pedidos complejos realizados mediante texto libre o **Notas de Voz**, interpretando qué productos quiere el cliente, cantidades y variaciones, cruzándolos con un inventario real en JSON.

## 📋 Características Principales

### 🧠 Inteligencia Artificial (Core)
* **Reconocimiento de Voz (Whisper):** Procesa audios de WhatsApp, los descarga, los convierte a formatos compatibles y los transcribe a texto con alta precisión usando la API de OpenAI.
* **Entendimiento de Intención (LLM):** Analiza el texto (transcrito o escrito) para extraer estructuradamente la intención de compra. Es capaz de entender frases como *"Dame dos kilos de tomate y una lechuga"* y mapearlo a los IDs del catálogo.
* **Personalidad Configurable:** Utiliza un "Prompt del Sistema" robusto para actuar como un vendedor amable, experto en frutas y verduras, que guía la venta sin salirse del personaje.

### 🛒 Gestión de Pedidos
* **Catálogo JSON:** Simula una base de datos ligera mediante un archivo `products.json` que contiene el inventario, precios y stock. Esto permite actualizaciones rápidas sin tocar base de datos SQL.
* **Lógica de Negocio:** Scripts personalizados (`customHandlers.js`) que validan si el producto solicitado existe en el inventario antes de confirmarlo al usuario.

### ⚙️ Arquitectura Técnica
* **Docker Ready:** Incluye un `Dockerfile` optimizado con Node.js 18 (Bullseye) y dependencias de sistema como `ffmpeg` (necesario para el procesamiento de audio de WhatsApp) listas para desplegar.
* **Cola de Procesos:** Implementa un sistema de `queue` para manejar múltiples peticiones simultáneas sin saturar el bot ni la API de WhatsApp.

## 📂 Estructura del Proyecto

* `app.js`: Punto de entrada principal. Configura el proveedor (Baileys), la base de datos (Mock) y los flujos de conversación.
* `scripts/`:
    * `audioHandler.js`: Maneja la descarga y conversión de medios.
    * `chatgpt.js`: Comunicación con la API de OpenAI (Completion y Transcription).
    * `products.js`: Funciones para leer y filtrar el archivo JSON de productos.
* `data/products.json`: El "cerebro" del inventario (Nombre, Precio, ID).
* `prompt/prompt.js`: Las instrucciones maestras que definen el comportamiento de la IA.

## 🚀 Instalación y Despliegue

1.  **Requisitos:** Node.js, una cuenta de OpenAI (API Key) y FFmpeg instalado en el sistema.
2.  **Configuración:** Crea un archivo `.env` con tus credenciales.
3.  **Instalar dependencias:**
    ```bash
    npm install
    ```
4.  **Ejecutar:**
    ```bash
    npm start
    ```
5.  **Escaneo:** Vincula el WhatsApp escaneando el código QR generado.

---
**Versión:** 1.0 (Prototipo)
**Estado:** Funcional (Requiere API Key de OpenAI)
**Tecnología:** Node.js, @bot-whatsapp, OpenAI API, FFmpeg.

### 📝 Snippets de Configuración

**1. Inventario (JSON):**
Para agregar productos, edita `data/products.json`:
```json
[
    {
        "id": "tomate_chonto",
        "name": "Tomate Chonto",
        "price": 4500,
        "category": "verduras"
    },
    // ... más productos
]
