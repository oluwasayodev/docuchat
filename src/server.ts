import app from "./app";
import {config} from "./lib/config";
import swaggerUi from 'swagger-ui-express'
import {swaggerSpec} from "./config/swagger";

if (config.env !== "production") {
    app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.get("api-docs.json", (req, res) => {
        res.json(swaggerSpec);
    })
}

app.listen(config.port, () => {
    console.log("Server listening on port: ", config.port);
})


