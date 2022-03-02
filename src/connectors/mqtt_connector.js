const mqtt = require("mqtt")
const DynamicConfig = require("../service/dynamic_config");

class MqttConnector {
    constructor(config, gateway) {
        this.config = DynamicConfig.getConnectorConfig(config)
        this.gateway = gateway
    }

    run() {
        const config = this.config
        const gateway = this.gateway

        const options = {
            clientId: config.broker.clientId,
            connectTimeout: 5000,
            username: config.broker.security.username,
            password: config.broker.security.password,
        }

        //const client = mqtt.connect("mqtt://test.mosquitto.org", options)
        const client = mqtt.connect(`mqtt://${config.host}:${config.port}`, options)

        client.on("connect", function () {
            console.log("MQTT connected")
            client.subscribe("v1/devices/gateway/telemetry", function (error) {
                if (error) {
                    console.log("Error occur when subscribe", error)
                }
            })
        })

        client.on("message", function (topic, message) {
            const data = JSON.parse(message.toString())
            gateway.processConvertedData(data)
        })
    }
}

module.exports = MqttConnector
