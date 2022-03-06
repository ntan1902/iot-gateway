const DynamicConfig = require("../service/dynamic_config");
const express = require("express")
const logger = require("morgan")
const bodyParser = require("body-parser")
const {StatusCodes, getReasonPhrase} = require("http-status-codes")
const MessageConverter = require("../helpers/message_converter");

class RestConnector {
    constructor(config, gateway) {
        this.config = DynamicConfig.getConnectorConfig(config)
        this.gateway = gateway

        this.configEndpointMap = {}

        this.config["mapping"].forEach(mapping => {
            this.configEndpointMap[mapping["endpoint"]] = mapping
        })

        this.app = express()

        this.app.use(logger("dev"))
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({extended: false}))

        this.app.listen(this.config.port, this.config.host, () => {
            console.log("Express server listening on port %d in %s", this.config.port, this.config.host);
        })

        this.app.use((req, res, next) => {
            res.header(
                "Access-Control-Allow_Headers",
                `Origin, Content-Type, Accept`
            )
            next();
        })
    }

    run() {
        this.config["mapping"].forEach(mapping => {
            mapping['HTTPMethods'].forEach(httpMethod => {
                switch (httpMethod) {
                    case "GET":
                        this.app.get(mapping.endpoint, this.handleRequest)
                        break
                    case "POST":
                        this.app.post(mapping.endpoint, this.handleRequest)
                        break
                    case "PUT":
                        this.app.put(mapping.endpoint, this.handleRequest)
                        break
                    case "PATCH":
                        this.app.patch(mapping.endpoint, this.handleRequest)
                        break

                }
            })
        })
    }

    handleRequest(req, res) {
        const jsonData = JSON.parse(this.convertDataFromRequest(req)?.toString())
        const convertedData = this.convertData(jsonData, req.url)
        this.gateway.gwSendTelemetry(convertedData)
        res.status(StatusCodes.OK).send()
    }

    convertDataFromRequest(req) {
        if (req.method === 'GET') {
            return req.query
        } else {
            return req.body
        }
    }

    convertData(jsonData, endpoint) {
        let json = {}

        const deviceName = MessageConverter.convert(this.configEndpointMap[endpoint]["converter"]['deviceNameExpression'], jsonData)
        const deviceLabel = MessageConverter.convert(this.configEndpointMap[endpoint]["converter"]['deviceLabelExpression'], jsonData)

        json["deviceName"] = deviceName;
        json["deviceLabel"] = deviceLabel;

        this.config['timeseries'].forEach(ts => {
            const {type: typeTs, key: keyTs, value: valueTs} = ts

            const key = MessageConverter.convert(keyTs, data)
            const value = MessageConverter.convert(valueTs, data)

            json = MessageConverter.generateJson(typeTs, key, value, json)
        })

        return json
    }
}

module.exports = RestConnector
