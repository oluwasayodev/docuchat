import swaggerJSDoc from "swagger-jsdoc";


const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: "DocuChat API",
            version: '1.0.0',
            description: "DocuChat API",
        },
        servers: [
            {url: '/api/v1', description: "Version 1"}
        ],
        components: {
            securitySchemas: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{bearerAuth: []}],
    },
    apis: ['../src/routes/*.route.ts'],
}

export const swaggerSpec = swaggerJSDoc(options);