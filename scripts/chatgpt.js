require("dotenv").config();
const axios = require("axios");
const { getAllProducts, addProduct, editProduct, deleteProduct } = require("./products");
const { getCurrentUserId } = require("../user/userContext");

const openaiApiKey = process.env.OPENAI_API_KEY;

// Definir números de teléfono de administradores
const adminNumbers = ['573206449915', '573205040546'];

// Verificar si el usuario es administrador
const isAdmin = (userId) => adminNumbers.includes(userId);

const functions = {
    getAllProducts: {
        description: "Ver todos los productos.",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    description: "La intención de conocer los productos."
                }
            },
            required: ["intent"]
        }
    },
    addProduct: {
        description: "Agregar un producto.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "El nombre del producto."
                },
                price: {
                    type: "number",
                    description: "El precio del producto."
                }
            },
            required: ["name", "price"]
        }
    },
    editProduct: {
        description: "Editar un producto.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "El nombre del producto a editar."
                },
                price: {
                    type: "number",
                    description: "El nuevo precio del producto."
                }
            },
            required: ["name", "price"]
        }
    },
    deleteProduct: {
        description: "Eliminar un producto.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "El nombre del producto a eliminar."
                }
            },
            required: ["name"]
        }
    }
};

const handleFunctionCall = async (functionName, parameters) => {
    const userId = getCurrentUserId();
    console.log(`User ${userId} is attempting to call function: ${functionName}`);

    if (!isAdmin(userId) && ['addProduct', 'editProduct', 'deleteProduct'].includes(functionName)) {
        return { message: 'Lo siento, no tienes permisos para realizar esta operación.' };
    }

    switch (functionName) {
        case 'getAllProducts': {
            const products = getAllProducts();
            const productsList = products.map(prod => `- ${prod.name}: $${prod.price}`).join('\n');
            return { message: `Lista de productos:\n${productsList}` };
        }

        case 'addProduct': {
            const { name, price } = parameters;
            addProduct({ name, price });
            return { message: `Producto '${name}' añadido correctamente.` };
        }

        case 'editProduct': {
            const { name, price } = parameters;
            const products = getAllProducts();
            const product = products.find(product => product.name.toLowerCase() === name.toLowerCase());
            if (product) {
                editProduct(product.id, { price });
                return { message: `Producto '${name}' editado correctamente.` };
            } else {
                return { message: `Producto '${name}' no encontrado.` };
            }
        }

        case 'deleteProduct': {
            const { name } = parameters;
            const products = getAllProducts();
            const product = products.find(product => product.name.toLowerCase() === name.toLowerCase());
            if (product) {
                deleteProduct(product.id);
                return { message: `Producto '${name}' eliminado correctamente.` };
            } else {
                return { message: `Producto '${name}' no encontrado.` };
            }
        }

        default:
            throw new Error(`Función no definida: ${functionName}`);
    }
};

const chat = async (prompt, messages) => {
    console.log("Enviando solicitud a ChatGPT con el siguiente contexto:", messages);
    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4o",
            messages: [
                { role: "system", content: prompt },
                ...messages
            ],
            functions: Object.keys(functions).map(fn => ({
                name: fn,
                description: functions[fn].description,
                parameters: functions[fn].parameters
            })),
            function_call: "auto",
        }, {
            headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json"
            }
        });

        const choice = response.data.choices[0];

        if (choice.finish_reason === "function_call") {
            const { name, arguments: params } = choice.message.function_call;
            console.log(`Función sugerida por OpenAI: ${name}`);
            console.log(`Parámetros enviados por OpenAI:`, params);

            const parsedParams = JSON.parse(params);
            const result = await handleFunctionCall(name, parsedParams);
            return result.message;
        } else {
            return choice.message.content;
        }
    } catch (err) {
        console.error("Error al conectar con OpenAI:", err.response ? err.response.data : err.message);
        return "ERROR";
    }
};

module.exports = { chat };